import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import type ChatMessage from "@chatFeat/typings/ChatMessage";

import type { SocketResponse } from "@typings/ApiResponse";
import type ManageChatRoomEventDto from "@qc/typescript/dtos/ManageChatRoomEventDto";
import type ManageChatRoomCallbackDto from "@chatFeat/dtos/ManageChatRoomCallbackDto";
import type TypingEventDto from "@qc/typescript/dtos/TypingEventDto";
import type TypingActivityEventDto from "@chatFeat/dtos/TypingActivityEventDto";
import type { ChatMessageEventDto } from "@qc/typescript/dtos/ChatMessageEventDto";

import { ChatEvent, CHAT_ROOM_ACTIONS } from "@qc/constants";

import { logger } from "@qc/utils";
import { history } from "@utils/History";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import { injectEndpoints } from "@services/api"
import { getSocketInstance, emitAsPromise } from "@services/socket";
import apiEntry from "@services/getLocaleEntry";
import allow500ErrorsTransform from "@services/allow500ErrorsTransform";
import { UPDATE_TARGET_FRIEND, TOGGLE_RESTRICTION } from "@chatFeat/redux/chatSlice";
import { ADD_TOAST, unexpectedErrorToast } from "@redux/toast/toastSlice";

let seenRestrictionMessage = false;

const socket = getSocketInstance("chat");

const chatApi = injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Joins or leaves global or private chat rooms.
     * @emitter
     */
    manageChatRoom: builder.mutation<ManageChatRoomCallbackDto, ManageChatRoomEventDto>({
      queryFn: async (data) => {
        const res = await emitAsPromise(socket)(ChatEvent.MANAGE_CHAT_ROOM, data);

        return res.error
          ? { error: { ...allow500ErrorsTransform(res.error!, res.meta) } }
          : res;
      },
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.catch((error) => {
          if (isFetchBaseQueryError(error.error)) {
            if (["bad request", "internal error"].includes(error.error.status as string))
              dispatch(
                unexpectedErrorToast(
                  apiEntry("manageChatRoom").error.unexpected
                )
              );
          }
        })
      }
    }),

    /**
     * When the user is typing.
     * @emitter
     */
    typing: builder.mutation<SocketResponse, TypingEventDto>({
      queryFn: async (data) => emitAsPromise(socket)(ChatEvent.TYPING, data)
    }),

    /**
     * Receives typing status updates from the friend in a private room.
     * @listener
     */
    friendTypingActivity: builder.mutation<{ resourcesLoaded?: boolean }, { resourcesLoaded?: boolean }>({
      queryFn: (loadedObj) => ({ data: loadedObj }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;
        
        if (data.resourcesLoaded) {
          logger.debug("friendTypingActivity listener initialized.");

          socket.on(ChatEvent.FRIEND_TYPING_ACTIVITY, ({ is_typing }: TypingActivityEventDto) => {
            try {
              logger.debug("TYPING ACTIVITY", { is_typing });

              dispatch(UPDATE_TARGET_FRIEND({ isTyping: is_typing }));
            } catch (error: any) {
              history.push("/error-500");
              logger.error("chatApi friendTypingActivity error:\n", error.message);
            }
          });
        } 
      }
    }),

    /**
     * Sends a chat message.
     * @emitter
     */
    chatMessage: builder.mutation<SocketResponse, ChatMessageEventDto>({
      queryFn: async (data) => emitAsPromise(socket)(ChatEvent.CHAT_MESSAGE, data),
      onQueryStarted: (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.catch((error) => {
          if (isFetchBaseQueryError(error.error) && error.error.status === "bad request") {
            // Too many duplicate messages (restrict on spam).
            dispatch(TOGGLE_RESTRICTION(true));
            if (!seenRestrictionMessage) {
              const { success, ...title } = apiEntry("chatMessage");
              dispatch(
                ADD_TOAST({
                  title: title.duplicate,
                  message: success.message,
                  intent: "error"
                })
              );
              seenRestrictionMessage = true;
            }
          }
        })
      }
    }),

    /**
     * Receives recently sent chat messages.
     * @listener
     */
    chatMessageSent: builder.mutation<
      { resourcesLoaded?: boolean },
      {
        resourcesLoaded?: boolean,
        callback: (chatMessage: ChatMessage, dispatch: ThunkDispatch<any, any, UnknownAction>) => void
      }
    >({
      queryFn: (loadedObj) => ({ data: loadedObj }),
      onQueryStarted: async ({ callback }, { dispatch, queryFulfilled }) => {
         const { data } = await queryFulfilled;
  
        if (data.resourcesLoaded) {
          logger.debug("chatMessageSent listener initialized.");

          socket.on(ChatEvent.CHAT_MESSAGE_SENT, (chatMessage: ChatMessage) => {
            try {
              logger.debug("CHAT MESSAGE SENT", chatMessage);

              if (
                !chatMessage.username &&
                CHAT_ROOM_ACTIONS.includes(chatMessage.action as any)
              )
                return dispatch(ADD_TOAST({ message: chatMessage.message, intent: "info" }));

              callback(chatMessage, dispatch);
            } catch (error: any) {
              history.push("/error-500");
              logger.error("chatApi chatMessageSent error:\n", error.message);
            }
          });
        }
      },
    }),
  }),
});

export const {
  endpoints: chatEndpoints,
  reducerPath: chatApiReducerPath,
  reducer: chatApiReducer,
  middleware: chatMiddleware,
  useManageChatRoomMutation,
  useTypingMutation,
  useFriendTypingActivityMutation,
  useChatMessageMutation,
  useChatMessageSentMutation
} = chatApi;

export default chatApi;
  