import type { ChatRoomId } from "@qc/typescript/typings/ChatRoomIds";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { ChatRoomAction } from "@qc/constants";

export default interface ChatMessage {
  room_id: ChatRoomId;
  avatar_url?: string;
  legal_name?: UserCredentials["legal_name"];
  country?: string;
  username: string;
  bio?: string;
  message: string;
  created_at: string;
  action?: ChatRoomAction;
}
