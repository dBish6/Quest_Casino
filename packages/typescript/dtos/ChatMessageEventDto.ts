import type { ChatRoomId } from "../typings/ChatRoomIds";
import type { UserCredentials } from "../typings/UserCredentials";

export interface PrivateChatMessageEventDto {
  room_id: ChatRoomId;
  avatar_url?: UserCredentials["avatar_url"];
  username: UserCredentials["username"];
  message: string;
}

export interface GlobalChatMessageEventDto extends PrivateChatMessageEventDto {
  legal_name: UserCredentials["legal_name"];
  country: UserCredentials["country"];
  bio?: string;
}

/** New chat message coming in. */
export type ChatMessageEventDto = GlobalChatMessageEventDto | PrivateChatMessageEventDto;

/**
 * A user's very last message in a chat room to be sent.
 */
export type LastChatMessageDto =
  | (PrivateChatMessageEventDto & { created_at: string })
  | { room_id: string; message: "" };
