import type { Model } from "mongoose";
import type { UserDoc, UserDocFriends, UserDocStatistics, UserDocActivity, UserDocNotifications } from "@authFeat/typings/User";

import { Schema } from "mongoose";
import { randomUUID } from "crypto";

import { validateEmail } from "@qc/utils";
import defaults from "@utils/schemaDefaults";

export const userFriendsSchema = new Schema<
  UserDocFriends,
  Model<UserDocFriends>
>(
  {
    _id: { type: Schema.Types.ObjectId, immutable: true },
    pending: {
      type: Map,
      of: { type: Schema.Types.ObjectId, ref: "user" },
      default: new Map()
    },
    list: {
      type: Map,
      of: { type: Schema.Types.ObjectId, ref: "user" },
      default: new Map()
    }
  },
  {
    collection: "user_friends",
    ...defaults.options
  }
);

export const userStatisticsSchema = new Schema<
  UserDocStatistics,
  Model<UserDocStatistics>
>(
  {
    _id: { type: Schema.Types.ObjectId, immutable: true },
    losses: {
      _id: false,
      type: {
        total: { type: Number },
        table: { type: Number },
        slots: { type: Number },
        dice: { type: Number }
      },
      default: { total: 0, table: 0, slots: 0, dice: 0 }
    },
    wins: {
      _id: false,
      type: {
        total: { type: Number },
        table: { type: Number },
        slots: { type: Number },
        dice: { type: Number },
        streak: { type: Number },
        rate: { type: Number }
      },
      default: {
        total: 0,
        table: 0,
        slots: 0,
        dice: 0,
        streak: 0,
        rate: 0
      }
    },
    progress: {
      _id: false,
      quest: {
        type: Map,
        of: {
          _id: false,
          quest: { type: Schema.Types.ObjectId, ref: "quest" },
          current: { type: Number, default: 0 },
          claimed: { type: Boolean, default: false }
        },
        default: new Map()
      },
      bonus: {
        type: Map,
        of: {
          _id: false,
          bonus: { type: Schema.Types.ObjectId, ref: "bonus" },
          current: { type: Number, default: 0 },
          activated: { type: Number }
        },
        default: new Map()
      }
    }
  },
  {
    collection: "user_statistics",
    ...defaults.options
  }
);

export const userActivitySchema = new Schema<
  UserDocActivity,
  Model<UserDocActivity>
>(
  {
    _id: { type: Schema.Types.ObjectId, immutable: true },
    game_history: {
      type: [
        {
          _id: false,
          game_name: { type: String, required: true },
          result: {
            outcome: { type: String, enum: ["win", "draw", "loss"], required: true }, // draw could be a push in blackjack.
            earnings: { 
              type: String,
              set: (odd: number) => odd.toFixed(2),
              validate: {
                validator: (odds: string) => /^\d+\.\d{2}$/.test(odds),
                message: (props: any) => `${props.value} is not a valid reward (e.g., 8.25).`
              },
              default: "0.00"
            }
          },
          timestamp: { type: Date, default: Date.now }
        }
      ]
    },
    payment_history: {
      type: [
        {
          // @ts-ignore
          _id: false,
          type: { type: String, enum: ["deposit", "withdraw"] },
          amount: {
            type: Number,
            default: 0,
            validate: {
              validator: (value: number) => value > 0,
              message: (props: any) => `${props.value} is not a positive number.`
            },
            set: (value: number) => Math.round(value * 100) / 100
          },
          timestamp: { type: Date, default: Date.now }
        }
      ]
    }
  },
  {
    collection: "user_activity",
    ...defaults.options
  }
)
  .index({ "game_history.timestamp": -1 })
  .index({ "payment_history.timestamp": -1 });

const notification = new Schema({
  _id: { type: Schema.Types.ObjectId, immutable: true },
  notification_id: { type: String, immutable: true, default: () => randomUUID() },
  type: { type: String, enum: ["news", "system", "general"], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: {
    sequence: { type: String },
    to: { type: String }
  },
  created_at: { type: Date, default: Date.now }
}).index({ created_at: -1 });
export const userNotificationsSchema = new Schema<
  UserDocNotifications,
  Model<UserDocNotifications>
>(
  {
    _id: { type: Schema.Types.ObjectId, immutable: true },
    friend_requests: [{ type: Schema.Types.ObjectId, ref: "user" }],
    // TODO: Limit
    notifications: {
      news: {
        _id: false,
        type: [notification]
      },
      system: {
        _id: false,
        type: [notification]
      },
      general: { 
        _id: false,
        type: [notification]
      }
    }
  },
  {
    collection: "user_notifications",
    ...defaults.options
  }
);

const userSchema = new Schema<UserDoc, Model<UserDoc>>(
  {
    _id: { type: Schema.Types.ObjectId, immutable: true },
    member_id: { 
      type: String,
      immutable: true,
      unique: true,
      default: () => randomUUID()
    },
    google_id: { 
      type: String,
      immutable: true,
      unique: true
    },
    avatar_url: {
      type: String,
      validate: {
        validator: (url: string) => /^https?:\/\//.test(url),
        message: (props: any) => `${props.value} is not a valid URL.`
      }
    },
    legal_name: {
      _id: false,
      type: { first: { type: String }, last: { type: String } },
      required: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
      validate: {
        validator: (email: string) => validateEmail(email),
        message: (props: any) => `${props.value} is an invalid email.`
      }
    },
    email_verified: { type: Boolean, default: false },
    username: {
      type: String,
      minlength: [3, "username field is less than the min of 3 characters."],
      maxlength: [24, "username field exceeds the max of 24 characters."],
      unique: true,
      required: true
    },
    password: { type: String, required: true },
    country: { type: String, required: true },
    region: { type: String },
    phone_number: {
      type: String,
      validate: {
        validator: (phone?: string) => !phone || /^\+\d{1,6}\s\(\d{1,4}\)\s\d{1,4}-\d{1,4}$/.test(phone),
        message: (props: any) => `${props.value} is not a valid phone number.`
      }
    },
    bio: {
      type: String,
      maxlength: [338, "bio field exceeds the max of 338 characters."]
    },
    balance: {
      type: Number,
      default: 0,
      set: (value: number) => Math.round(value * 100) / 100
    },
    favourites: { type: Map, of: Boolean, default: new Map() },
    limit_changes: { country: { type: Number } },
    locked: {
      type: String,
      enum: {
        values: ["suspicious", "banned", "attempts"],
        message: "Reason for locking is not valid."
      }
    },
    settings: {
      _id: false,
      notifications: { type: Boolean, default: true },
      // TODO: Limit to something.
      blocked_list: {
        type: Map,
        of: { type: Schema.Types.ObjectId, ref: "user" },
        default: new Map()
      },
      visibility: { type: Boolean, default: true },
      block_cookies: { type: Boolean, default: false }
    },
    friends: {
      type: Schema.Types.ObjectId,
      ref: "friends",
      required: true
    },
    statistics: {
      type: Schema.Types.ObjectId,
      ref: "statistics",
      required: true
    },
    activity: {
      type: Schema.Types.ObjectId,
      ref: "activity",
      required: true
    },
    notifications: {
      type: Schema.Types.ObjectId,
      ref: "notifications",
      required: true
    }
  },
  { collection: "user", ...defaults.options }
);

export default userSchema;
