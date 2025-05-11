import type { LocaleEntry } from "@typings/Locale";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { DragPointsKey } from "../Aside";
import type { MutationActionCreatorResult } from "@reduxjs/toolkit/query";
import type ChatMessage from "@chatFeat/typings/ChatMessage";
import type { LastChatMessageDto } from "@qc/typescript/dtos/ChatMessageEventDto";

import { useRef, memo, useState, useMemo, useEffect, cloneElement } from "react";

import { logger, capitalize } from "@qc/utils";
import injectElementInText from "@utils/injectElementInText";
import CircularQueue from "@chatFeat/utils/CircularQueue";

import useResourceLoader from "@hooks/useResourceLoader";
import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";

import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { selectChatRoom, selectInitialized } from "@chatFeat/redux/chatSelectors";
import { SET_CHAT_INITIALIZED, SET_CHAT_ROOM_LOADING, UPDATE_CHAT_ROOM, UPDATE_TARGET_FRIEND } from "@chatFeat/redux/chatSlice";
import { useManageChatRoomMutation, useChatMessageSentMutation, useFriendTypingActivityMutation } from "@chatFeat/services/chatApi";

import { Avatar } from "@components/common";
import { ModalTrigger } from "@components/modals";
import { SkeletonAvatar, SkeletonText, Skeleton } from "@components/loaders";
import { ScrollArea } from "@components/scrollArea";
import Timestamp from "../Timestamp";

import s from "./chat.module.css";

interface ChatMessageBubbleDefaultProps {
  localeEntry: LocaleEntry;
  user: UserCredentials | null;
  chatMsg: ChatMessage | null;
}

interface ChatMessageBubbleEnlargedProps extends ChatMessageBubbleDefaultProps {
  groupLevel?: "top" | "bottom" | "single" | "mid"
}

interface ChatMessagesProps {
  localeEntry: LocaleEntry;
  user: UserCredentials | null;
  asideState: DragPointsKey;
}

export default function ChatMessages({ localeEntry, user, asideState }: ChatMessagesProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const chatMsgs = useRef<CircularQueue | null>(null),
    [chatMsgCount, setChatMsgCount] = useState(0),
    initialJoin = useRef(true);

  const chatRoom = useAppSelector(selectChatRoom),
    initialized = useAppSelector(selectInitialized),
    dispatch = useAppDispatch();

  const { resourcesLoaded } = useResourceLoader();

  const [emitManageChatRoom] = useManageChatRoomMutation(),
    [chatMessageSentListener] = useChatMessageSentMutation(),
    [friendTypingActivityListener] = useFriendTypingActivityMutation();

  /** 
   * The last message is a flag for an active private chat room also, so there is no need to search through users to find active chats.
   */
  const handleLastMessage = Object.freeze({
    /** 
     * Handles initialization for a new private chat room with no messages, marking it as a `Previous Chat`.
     */
    new: (id: string) => {
      dispatch(UPDATE_CHAT_ROOM({ lastChatMessage: { room_id: id, message: "" } }));
    },
    /** 
     * Updates the last message for a private chat room after the initial join.
     */
    update: () => {
      if (chatMsgCount && chatRoom.accessType === "private") {
        if (!initialJoin.current) {
          const chatMsg = chatMsgs.current?.peek()! as LastChatMessageDto;
          dispatch(UPDATE_CHAT_ROOM({ lastChatMessage: chatMsg }));
        } else {
          initialJoin.current = false;
        }
      }
    },
    /** 
     * Ensures the last chat message is sent when the user exits completely.
     */ 
    beforeunload: () => {
      if (chatRoom.lastChatMessage)
        emitManageChatRoom({
          access_type: chatRoom.accessType,
          room_id: {},
          last_message: chatRoom.lastChatMessage
        })
    }
  });

  const setupChatListeners = async (): Promise<MutationActionCreatorResult<any>[]> => {
    // Listens for new messages coming in.
    const messageSentMutation = chatMessageSentListener({
      resourcesLoaded,
      callback: (chatMessage) => {
        chatMsgs.current!.enqueue(chatMessage);
        setChatMsgCount((prev) => prev + 1);
      }
    })
    await messageSentMutation;

    const typingActivityMutation = friendTypingActivityListener({ resourcesLoaded })
    await typingActivityMutation;

    return [messageSentMutation, typingActivityMutation]
  };
  
  /** 
  * Handles joins, leaves and chat initialization.
  */
  // FIXME: You probably have to move the joining and leaving to the base Chat component because when the chat is shrunk, we don't want to keep joining and leaving...?
  useResourcesLoadedEffect(() => {
    (async () => {
      if (user?.email_verified && chatRoom.proposedId) {
        dispatch(SET_CHAT_ROOM_LOADING(true));
        let initialListenerMutations: MutationActionCreatorResult<any>[];

        const joinMutation = emitManageChatRoom({
          access_type: chatRoom.accessType,
          room_id: { leave: chatRoom.snapshotId, join: chatRoom.proposedId }, // Keeps swapping.
          last_message: chatRoom.lastChatMessage
        });
        const res = await joinMutation;

        if (res.data?.status === "ok") {
          const data = res.data;
          if (data.chat_id && data.chat_messages) {
            // Initializes messages.
            chatMsgs.current = new CircularQueue(data.chat_messages);
            setChatMsgCount(data.chat_messages.length);
            // On a new private room...
            if (!data.chat_messages?.length && chatRoom.accessType === "private")
              handleLastMessage.new(data.chat_id);

            logger.debug("Chat ID and messages initialized.");
            dispatch(
              UPDATE_CHAT_ROOM({ currentId: data.chat_id })
            );
          }

          if (!initialized) {
            initialListenerMutations = await setupChatListeners();

            window.addEventListener("beforeunload", handleLastMessage.beforeunload);
            dispatch(SET_CHAT_INITIALIZED(true));
          }

          dispatch(SET_CHAT_ROOM_LOADING(false));
          initialJoin.current = true;
        }

        return () => {
          [joinMutation, ...initialListenerMutations].forEach((mutation) => {
            if (mutation) mutation.abort();
          });
          window.removeEventListener("beforeunload", handleLastMessage.beforeunload);
        }
      }
    })();
  }, [user?.email_verified, chatRoom.proposedId]);

  /**
   * Happens when currentId switches to null when private button is pressed.
   */
  useEffect(() => {
    if (chatMsgs.current?.size && !chatRoom.currentId) setChatMsgCount(0);
  }, [chatRoom.accessType])

  /**
   * Updates the user's last message sent on count and also checks if clearing the is 
   * typing message for a private room is needed.
   */
  useEffect(() => {
    handleLastMessage.update();

    if (
      chatRoom.accessType === "private" &&
      chatMsgs.current?.peek()?.username === chatRoom.targetFriend?.friend?.username
    )
      dispatch(UPDATE_TARGET_FRIEND({ isTyping: false }));
  }, [chatMsgCount])

  const messageInputHeight = useRef(0);
  /** 
   * Scrolls to the bottom on new chat messages.
   */
  useEffect(() => {
    if (!chatRoom.loading && chatMsgCount) {
      const viewport = scrollContainerRef.current!.children.item(1)!;

      if (!messageInputHeight.current)
        messageInputHeight.current = parseInt(
          window.getComputedStyle(viewport)
            .getPropertyValue(asideState === "enlarged" ? "--_input-height-full" : "--_input-height"),
          10
        );

      viewport.scrollTo({
        top: viewport.scrollHeight - messageInputHeight.current,
        behavior: "smooth"
       })
    }
  }, [chatRoom.loading, chatMsgCount])

  const chatMessages = useMemo(() => {
    logger.debug("useMemo chatMsgs.current", chatMsgs.current);
    const chatMsgsJSX: React.JSX.Element[] = [],
      ChatBubbleComponent = ChatMessageBubble[capitalize(asideState) as keyof typeof ChatMessageBubble];

    let i = 0;

    if (asideState === "enlarged" && chatMsgCount) {
      const values = chatMsgs.current?.values();
      let prev = { username: "", index: -1 },
        current = values?.next(),
        groupCount = 0;

      // Updates the previous group if it had only one message.
      const handleGroupWithOneMsg = () => {
        if (prev.index !== -1 && groupCount === 1) {
          const prevChatBubble = chatMsgsJSX[prev.index];
          if (prevChatBubble.props.groupLevel === "top") {
            chatMsgsJSX[prev.index] = cloneElement(prevChatBubble, { groupLevel: "single" });
          }
        }
      }

      // Uses the groupLevel prop to handle grouping.
      while (!current?.done) {
        const chatMsg = current!.value,
          next = values?.next();

        if (chatMsg.username !== prev.username) {
          handleGroupWithOneMsg();
          // New group starts here.
          chatMsgsJSX.push(
            <ChatBubbleComponent
              key={`${chatMsg.username}-${i}`}
              localeEntry={localeEntry}
              user={user}
              chatMsg={chatMsg}
              groupLevel="top"
            />
          );

          groupCount = 1;
        } else {
          chatMsgsJSX.push(
            <ChatBubbleComponent 
              key={`${chatMsg.username}-${i}`}
              localeEntry={localeEntry}
              user={user}
              chatMsg={chatMsg}
              groupLevel={(next?.done || next!.value.username !== chatMsg.username) ? "bottom" : "mid"}
            />
          );

          groupCount++;
        }
  
        prev = { username: chatMsg.username, index: chatMsgsJSX.length - 1 };
        current = next;
        i++;
      }

      handleGroupWithOneMsg();
    } else {
      for (const chatMsg of chatMsgs.current?.values() || []) {
        chatMsgsJSX.push(
          <ChatBubbleComponent
            key={`${chatMsg.username}-${i}`}
            localeEntry={localeEntry}
            user={user}
            chatMsg={chatMsg}
          />
        );
        i++;
      }
    }

    return chatMsgsJSX;
  }, [chatMsgCount, asideState]);

  return (
    <ScrollArea
      ref={scrollContainerRef}
      role="log"
      aria-roledescription="chat conversation"
      aria-label={
        chatRoom.loading
          ? localeEntry.aria.label.chat.replace(/[{}]/g, "")
          : localeEntry.aria.label.chat.replace(/\s*{[^{}]*}\s*/g, "")
      }
      orientation="vertical"
      id="chatMsgs"
      className={s.chatConversation}
    >
      {user ? (
        chatRoom.loading ? (
          <>
            {Array.from({ length: 10 }).map((_, i) => {
              const ChatBubbleComponent = ChatMessageBubble[capitalize(asideState) as keyof typeof ChatMessageBubble];
              return <ChatBubbleComponent key={i} localeEntry={localeEntry} user={null} chatMsg={null} groupLevel="bottom" />
            })}
          </>
        ) : !chatMsgCount ? (
          <p>{localeEntry.empty}</p>
        ) : (
          <>{chatMessages}</>
        )
      ) : (
        <p>
          {injectElementInText(localeEntry.loginRequired, null,
            (text) => (
              <ModalTrigger query={{ param: "login" }} intent="primary">
                {text}
              </ModalTrigger>
            ),
            { localeMarker: true }
          )}
        </p>
      )}
    </ScrollArea>
  );
}

const ChatMessageBubble = {
  Default: memo(({ localeEntry, user, chatMsg }: ChatMessageBubbleDefaultProps) => {
    return (
      <div 
        role="group" 
        aria-roledescription="chat message"
        className={s[`message${!chatMsg ? "Skeleton" : ""}`]}
      >
        <div
          className={s.header}
          {...(chatMsg?.username === user?.username && { "data-user": "" })}
        >
          <div className={s.nameAva}>
            {chatMsg ? (
              <>
                <Avatar user={chatMsg} linkProfile={false} />
                <h4 title={chatMsg.username}>
                  {chatMsg?.username === user?.username ? localeEntry.you : chatMsg.username}
                </h4>
              </>
            ) : (
              <>
                <SkeletonAvatar size="sm" />
                <SkeletonText
                  size="paraXxSmall"
                  style={{ width: Math.random() < 0.5 ? "28px" : "39px" }}
                />
              </>
            )}
          </div>

          {chatMsg ? (
            <Timestamp activity={{ timestamp: chatMsg.created_at }} aria-hidden="true" />
          ) : (
            <SkeletonText size="paraXxSmall" className={s.timeSkel} />
          )}
        </div>
        {chatMsg ? (
          <p>{chatMsg.message}</p>
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonText
              key={i}
              size="paraXSmall"
              className={s.paraSkel}
              {...(i === 2 && {
                style: { width: Math.random() < 0.5 ? "30%" : "55%" }
              })}
            />
          ))
        )}
      </div>
    );
  }),

  Enlarged: memo(({ localeEntry, user, chatMsg, groupLevel }: ChatMessageBubbleEnlargedProps) => {
    const isCurrentUser = chatMsg ? chatMsg?.username === user?.username : Math.random() < 0.5;
    
    return (
      <div
        role="group"
        aria-roledescription="chat message"
        className={s.message}
        data-user={isCurrentUser}
        data-group-level={groupLevel}
      >
        {["bottom", "single"].includes(groupLevel!) &&
          !isCurrentUser && (
            <>{chatMsg ? <Avatar user={{ avatar_url: chatMsg.avatar_url }} /> : <SkeletonAvatar size="sm" />}</>
          )}

        <>
          {chatMsg ? (
            <div className={s.bubble}>
              {["top", "single"].includes(groupLevel!) && (
                <div className={s.header}>
                  <h4 title={chatMsg.username}>
                    {chatMsg.username === user?.username ? localeEntry.you : chatMsg.username}
                  </h4>
                  <Timestamp aria-hidden="true" activity={{ timestamp: chatMsg.created_at }}/>
                </div>
              )}

              <p>{chatMsg.message}</p>
            </div>
          ) : (
            <div
              className={s.bubble}
              style={{ minWidth: Math.random() < 0.5 ? "108px" : "210px" }} 
            >
              <div className={s.header}>
                <SkeletonText
                  size="paraXxSmall"
                  style={{ width: Math.random() < 0.5 ? "32px" : "48px" }}
                />
                <SkeletonText size="paraXxSmall" className={s.timeSkel} />
              </div>

              <Skeleton className={s.pSkel} />
            </div>
          )}
        </>
      </div>
    );
  })
};
