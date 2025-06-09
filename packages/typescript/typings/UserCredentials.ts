export type ActivityStatuses = "online" | "away" | "offline";

/**
 * The absolute minimum user credentials that can be sent to the client.
 */
export interface MinUserCredentials {
  member_id: string;
  avatar_url?: string;
  legal_name: { first: string; last: string };
  username: string;
}
/**
 * Extends `MinUserCredentials` and adds `country` and `bio`.
 */
export interface MinUserWithExtraCredentials extends MinUserCredentials {
  country: string;
  bio?: string;
}

/**
 * All credentials on the client of a friend of a user.
 */
export interface FriendCredentials extends MinUserWithExtraCredentials {
  /** The very last private message sent in the friend room (private room). */
  last_chat_message?: string;
  activity: { status: ActivityStatuses; inactivity_timestamp?: string };
}

/**
 * The user credentials on the client of the current user.
 */
export interface UserCredentials
  extends Omit<FriendCredentials, "activity" | "last_chat_message">,
    StatisticsCredential {
  email_verified: boolean;
  region?: string;
  phone_number?: string;
  balance: number;
  favourites: { [title: string]: boolean };
  locked?: "suspicious" | "banned" | "attempts";
  settings: {
    /** Enable or disable the sound effect on new notifications and indicator. */
    notifications: boolean;
    blocked_list: { [member_id: string]: MinUserCredentials };
    /** Hides game activity and statistics if false. */
    visibility: boolean;
    block_cookies: boolean;
  };
  friends: {
    pending: { [member_id: string]: MinUserCredentials };
    list: { [member_id: string]: FriendCredentials };
  };
}
/**
 * The statistics field on the client.
 */
interface StatisticsCredential {
  statistics: {
    losses: {
      total: number;
      table: number;
      slots: number;
      dice: number;
    };
    wins: {
      total: number;
      table: number;
      slots: number;
      dice: number;
      streak: number;
      rate: number;
    };
    progress: {
      quest: {
        [title: string]: {
          current: number;
          quest: { cap: number };
        };
      };
      bonus: {
        [title: string]: {
          current: number;
          activated: number;
          bonus: { cap: number };
        };
      };
    };
  };
}

/**
 * The user's credentials shown on their private profile page.
 */
export interface UserProfileCredentials extends UserCredentials {
  email: string;
  activity: {
    game_history: UserGameHistoryEntry[];
  };
}

/**
 * The credentials shown on a user's public profile.
 */
export interface ViewUserProfileCredentials
  extends MinUserWithExtraCredentials,
    StatisticsCredential {
  activity: {
    game_history: UserGameHistoryEntry[];
    status: ActivityStatuses;
  };
}

export default interface UserGameHistoryEntry {
  game_name: string;
  result: {
    outcome: "win" | "loss";
    earnings: string;
  };
  timestamp: string;
}
