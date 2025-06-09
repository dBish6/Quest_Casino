export const CHAT_ROOM_ACTIONS = ["join", "leave"] as const;
export type ChatRoomAction = (typeof CHAT_ROOM_ACTIONS)[number];
