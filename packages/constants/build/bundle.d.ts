export declare const AVATAR_FILE_EXTENSIONS: ReadonlySet<string>;
export declare const CHAT_ROOM_ACTIONS: readonly ["join", "leave"];
export type ChatRoomAction = (typeof CHAT_ROOM_ACTIONS)[number];
export declare enum AuthEvent {
    INITIALIZE_FRIENDS = "initialize_friends",
    MANAGE_FRIEND_REQUEST = "manage_friend_request",
    UNFRIEND = "unfriend",
    FRIENDS_UPDATE = "friends_update",
    FRIEND_ACTIVITY = "friend_activity",
    USER_ACTIVITY = "user_activity",
    LOCALE_CHANGE = "locale_change",
    NEW_NOTIFICATION = "new_notification"
}
export declare enum ChatEvent {
    MANAGE_CHAT_ROOM = "manage_chat_room",
    TYPING = "typing",
    FRIEND_TYPING_ACTIVITY = "friend_typing_activity",
    CHAT_MESSAGE = "chat_message",
    CHAT_MESSAGE_SENT = "chat_message_sent"
}
export declare enum GameEvent {
    MANAGE_RECORD = "manage_record",
    MANAGE_PROGRESS = "manage_progress"
}
export declare const GAME_STATUSES: readonly ["active", "development", "inactive"], GAME_CATEGORIES: readonly ["table", "slots", "dice"];
export type GameStatus = (typeof GAME_STATUSES)[number];
export type GameCategory = (typeof GAME_CATEGORIES)[number];
export declare const LEADERBOARD_TYPES: readonly ["rate", "total"];
export type LeaderboardType = (typeof LEADERBOARD_TYPES)[number];
export declare const GAME_QUEST_REWARD_TYPES: readonly ["money", "spins"], GAME_QUEST_FOR: readonly ["all", "blackjack", "slots", "dice"], GAME_QUEST_STATUSES: readonly ["active", "inactive"];
export type GameQuestRewardType = (typeof GAME_QUEST_REWARD_TYPES)[number];
export type GameQuestFor = (typeof GAME_QUEST_FOR)[number];
export type GameQuestStatus = (typeof GAME_QUEST_STATUSES)[number];
export declare const GAME_BONUS_STATUSES: readonly ["active", "inactive"];
export type GameBonusStatus = (typeof GAME_BONUS_STATUSES)[number];
export declare const LANGUAGES: {
    readonly en: {
        readonly name: "English";
        readonly locale: "en";
    };
    readonly fr: {
        readonly name: "Français";
        readonly locale: "fr";
    };
};
export type AvailableLocales = typeof LANGUAGES[keyof typeof LANGUAGES]["locale"];
export declare const TRANSACTION_TYPES: readonly ["deposit", "withdraw"];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
