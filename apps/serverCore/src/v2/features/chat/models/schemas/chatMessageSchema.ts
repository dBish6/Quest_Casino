import type { Model } from "mongoose";
import type { GlobalChatMessageDoc, PrivateChatMessageDoc } from "@chatFeat/typings/ChatMessage";
import type { GlobalChatRoomId } from "@qc/typescript/typings/ChatRoomIds";

import { Schema, model } from "mongoose";

import MAX_MESSAGES_COUNT from "@chatFeat/constants/MAX_MESSAGES_COUNT";

import defaults from "@utils/schemaDefaults";

export const globalChatMessageSchema = new Schema<GlobalChatMessageDoc, Model<GlobalChatMessageDoc>>(
  {
    room_id: { type: String, required: true },
    avatar_url: {
      type: String,
      validate: {
        validator: (url: string) => {
          return /^https?:\/\//.test(url);
        },
        message: (props: any) => `${props.value} is not a valid URL.`
      }
    },
    username: { type: String, required: true },
    // Adding these extra fields might be overkill, this is supposed to be light since we are using redis and stringify a lot. Worry about that if we had a lot of users.
    legal_name: {
      _id: false,
      type: { first: { type: String }, last: { type: String } },
      required: true
    },
    country: { type: String, required: true },
    bio: {
      type: String,
      maxlength: [338, "bio field in chat message exceeds the max of 338 characters."]
    },
    message: { type: String, required: true }
  },
  {
    capped: { size: 102400, max: MAX_MESSAGES_COUNT.global.stored },
    ...defaults.options,
    timestamps: { createdAt: "created_at", updatedAt: false }
  }
).index({ created_at: 1 });

export const privateChatMessageSchema = new Schema<PrivateChatMessageDoc, Model<PrivateChatMessageDoc>>(
  {
    room_id: { type: String, unique: true, required: true },
    chats: {
      type: [
        {
          _id: false,
          room_id: { type: String, immutable: true, required: true },
          avatar_url: {
            type: String,
            validate: {
              validator: (url: string) => {
                return /^https?:\/\//.test(url);
              },
              message: (props: any) => `${props.value} is not a valid URL.`
            }
          },
          username: { type: String, required: true },
          message: { type: String, required: true },
          created_at: { type: Date, required: true }
        }
      ]
    }
  },
  {
    collection: "chat_message_private",
    ...defaults.options
  }
).index({ "chats.created_at": -1 });

export const GlobalChatMessage = (continent: GlobalChatRoomId) =>
  model(
    "chat_message_global",
    globalChatMessageSchema,
    `chat_message_global_${continent.replace(" ", "_").toLowerCase()}`
  );
