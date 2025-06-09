import type { Document, ObjectId } from "mongoose";
import type { JwtPayload } from "jsonwebtoken";
import type DefaultDocFields from "@typings/DefaultDocFields";
import type RegisterBodyDto from "@qc/typescript/dtos/RegisterBodyDto";
import type { NotificationTypes, Notification } from "@qc/typescript/dtos/NotificationsDto";
import type { GameQuestDoc, GameBonusDoc } from "@gameFeat/typings/Game";
import type { PaymentHistoryEntry } from "@qc/typescript/dtos/PaymentHistoryDto";

export type GetUserBy = "_id" | "email" | "username" | "member_id" | "google_id";

/**
 * Type for creating a initial user in the database.
 */
export interface InitializeUser extends Omit<RegisterBodyDto, "calling_code"> {
  google_id?: string;
  avatar_url?: string;
  first_name: string;
  last_name: string;
  email_verified?: boolean;
}

export interface UserToClaims {
  _id: ObjectId;
  member_id: string;
  legal_name: { first: string; last: string };
  email: string;
  email_verified: boolean;
  username: string;
  country: string;
  region?: string;
  phone_number?: string;
}

export interface UserClaims extends Omit<UserToClaims, "_id">, JwtPayload {
  /** The user's `_id` as a string. */
  sub: string;
}

/** Email verification or password reset claims. */
export interface VerificationClaims extends JwtPayload {
  /** The user's `_id` as a string. */
  sub: string;
  email: string;
}

/**
 * All fields within a user document.
 */
export interface User extends DefaultDocFields {
  _id: ObjectId;
  member_id: string;
  google_id?: string;
  avatar_url?: string;
  legal_name: {
    first: string;
    last: string;
  };
  email: string;
  email_verified: boolean;
  username: string;
  password: string;
  country: string;
  region?: string;
  phone_number?: string;
  bio?: string;
  balance: Number;
  favourites: Map<string, boolean>;
  limit_changes?: { country: number };
  locked?: "suspicious" | "banned" | "attempts";
  settings: {
    /** Enable or disable the sound effect on new notifications and indicator. */
    notifications: boolean;
    /** Maps `member_id` to boolean. */
    blocked_list: Map<string, UserDoc>;
    /** Hides game activity and statistics if false. */
    visibility: boolean;
    block_cookies: boolean;
  };
  friends: UserDocFriends;
  statistics: UserDocStatistics;
  activity: UserDocActivity;
  notifications: UserDocNotifications;
}

export interface UserDoc extends Document, User {
  _id: ObjectId;
}

export interface UserDocFriends extends Document, DefaultDocFields {
  _id: ObjectId;
  /**
   * Maps `member_id` to user ObjectIds for friends that are pending.
   */
  pending: Map<string, UserDoc>;
  /**
   * Maps `member_id` to user ObjectIds for friends that are added.
   */
  list: Map<string, UserDoc>;
}

export interface UserQuest {
  quest: GameQuestDoc;
  current: number;
  /**
   * When they claim the award.
   */
  claimed: boolean;
}
export interface UserBonus {
  bonus: GameBonusDoc;
  current: number;
  /**
   * Activated also acts as a expiry timestamp. When activated, this would be 1 day from
   * when it was set (in milliseconds).
   */
  activated: number;
}
export interface UserDocStatistics extends Document, DefaultDocFields {
  _id: ObjectId;
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
    /** Total win rate. */
    rate: number;
  };
  progress: {
    quest: Map<string, UserQuest>;
    bonus: Map<string, UserBonus>;
  };
}

export interface PaymentHistoryField extends Omit<PaymentHistoryEntry, "timestamp"> {
  timestamp: Date;
}
export interface UserDocActivity extends Document, DefaultDocFields {
  _id: ObjectId;
  game_history: {
    game_name: string;
    result: {
      outcome: "win" | "loss";
      earnings: string;
    };
    timestamp: Date;
  }[];
  payment_history: PaymentHistoryField[];
}

export interface UserNotification extends Omit<Notification, "_id" | "created_at"> {
  _id: ObjectId;
  created_at: Date;
}
export type UserNotificationField = {
  [key in NotificationTypes]: UserNotification[];
};
export interface UserDocNotifications extends Document, DefaultDocFields {
  _id: ObjectId;
  friend_requests: ObjectId[];
  notifications: UserNotificationField;
}
