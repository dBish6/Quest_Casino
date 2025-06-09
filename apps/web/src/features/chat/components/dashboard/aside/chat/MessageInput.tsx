import type { LocaleEntry } from "@typings/Locale";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { DragPointsKey } from "../Aside";

import { useRef } from "react";
import { debounce } from "tiny-throttle";

import { useAppSelector } from "@redux/hooks";
import { selectChatRoom, selectRestriction } from "@chatFeat/redux/chatSelectors";
import { useTypingMutation, useChatMessageMutation } from "@chatFeat/services/chatApi";

import { Button, Input } from "@components/common/controls";
import { Icon } from "@components/common";
import { Form } from "@components/form";

import s from "./chat.module.css";

interface MessageInputProps {
  localeEntry: LocaleEntry;
  user: UserCredentials | null; 
  asideState: DragPointsKey;
}

export default function MessageInput({ localeEntry, user, asideState }: MessageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null),
    typingMsgRef = useRef<HTMLParagraphElement>(null);

  const chatRoom = useAppSelector(selectChatRoom),
    restriction = useAppSelector(selectRestriction);

  const [emitChatMessage, { isLoading: emitChatMessageLoading }] = useChatMessageMutation(),
    [emitTyping] = useTypingMutation(),
    disableInput = chatRoom.loading || !chatRoom.currentId || emitChatMessageLoading || restriction.started;

  const debouncedSendChatMessage = debounce(async () => {
    const message = inputRef.current!.value.trim();

    if (chatRoom.currentId && message) {
      const res = await emitChatMessage({
        room_id: chatRoom.currentId,
        avatar_url: user!.avatar_url,
        username: user!.username,
        message: inputRef.current!.value,
        ...(chatRoom.accessType === "global" && {
          legal_name: user!.legal_name,
          country: user!.country,
          bio: user!.bio
        })
      });

      if (res.data?.status === "ok") inputRef.current!.value = "";
    }
  }, 700);

  const typeTrueSent = useRef(false);
  const handleTyping = () => {
    const friend = chatRoom.targetFriend?.friend;

    if (chatRoom.accessType === "private" && friend) {
      const shouldEmit = !!inputRef.current!.value.length;

      if (typeTrueSent.current !== shouldEmit) {
        emitTyping({
          friend_member_id: friend.member_id!,
          is_typing: shouldEmit
        });
        typeTrueSent.current = shouldEmit;
      }
    }
  };

  // TODO: textarea.
  return (
    <div className={s.formContainer} data-restriction={restriction.started}>
      {chatRoom.targetFriend?.isTyping && (
        <p ref={typingMsgRef} className={s.typingMessage}>
          <span>{chatRoom.targetFriend.friend!.username}</span> {localeEntry.typing}
        </p>
      )}

      <Form
        onSubmit={(e) => {
          e.preventDefault();
          debouncedSendChatMessage();
        }}
      >
        <Input
          ref={inputRef}
          label={localeEntry.message}
          intent="primary"
          size={asideState === "enlarged" ? "xl" : "lrg"}
          id="messenger"
          onInput={handleTyping}
          onFocus={() => {
            const typingMsgStyle = typingMsgRef.current?.style;
            if (typingMsgStyle) typingMsgStyle.top = "-1px";
          }}
          onBlur={() => {
            const typingMsgStyle = typingMsgRef.current?.style;
            if (typingMsgStyle) 
              typingMsgStyle.top = asideState === "enlarged" ? "3px" : "2px";
          }}
          Button={
            <Button
              intent="primary"
              size={asideState === "enlarged" ? "xl" : "lrg"}
              iconBtn
              type="submit"
              tabIndex={0}
              disabled={disableInput}
            >
              <Icon id={asideState === "enlarged" ? "send-24" : "send-18"} />
            </Button>
          }
          // user here is useUser and it's undefined on the server and loaded on the client, so user helps with hydration issues also.
          error={user && restriction.started && (
            <>
              {localeEntry.restriction} <span id="coolCounter"></span>
            </>
          )}
          disabled={disableInput}
        />
      </Form>
    </div>
  );
}