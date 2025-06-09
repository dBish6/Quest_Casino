import type { Document, ObjectId } from "mongoose";
import type { GlobalChatMessageEventDto, PrivateChatMessageEventDto, ChatMessageEventDto } from "@qc/typescript/dtos/ChatMessageEventDto";
import type { GlobalChatRoomId, PrivateChatRoomId } from "@qc/typescript/typings/ChatRoomIds";
import type DefaultDocFields from "@typings/DefaultDocFields";

/**
 * Either global or private chat message fields within a document.
 */
export type ChatMessage = ChatMessageEventDto & {
  created_at: Date;
}

export interface GlobalChatMessageDoc extends Document, GlobalChatMessageEventDto {
  _id: ObjectId;
  room_id: GlobalChatRoomId;
}

export interface PrivateChatMessageDoc extends Document, DefaultDocFields {
  _id: ObjectId;
  room_id: string;
  chats: (PrivateChatMessageEventDto & { room_id: PrivateChatRoomId })[];
  updated_at: Date;
}

export type ChatMessageDoc = GlobalChatMessageDoc | PrivateChatMessageDoc;