/**
 * Chat Service
 *
 * Description:
 * Handles functionalities for managing messages in global and private chat rooms that can be for HTTP or Sockets.
 */

import type { ChatRoomId, GlobalChatRoomId } from "@qc/typescript/typings/ChatRoomIds";
import type { ChatMessage } from "@chatFeat/typings/ChatMessage";

import MAX_MESSAGES_COUNT from "@chatFeat/constants/MAX_MESSAGES_COUNT";

import { logger } from "@qc/utils"
import { handleApiError, SocketError } from "@utils/handleError";
import Lock from "@utils/DistributedLock";
import chatRoomUtils from "@chatFeat/utils/ChatRoomsUtils";

import { GlobalChatMessage, PrivateChatMessage } from "@chatFeat/models";
import { redisClient } from "@cache";

/**
 * Archives cached chat messages to the database.
 */
export async function archiveChatMessageQueue(roomId: ChatRoomId) {
  const lock = new Lock("archive_messages", 60);

  try {
    // Lock because this can happen at the same time for multiple connections since this is used in chat messaging.
    lock.withLock(async () => {
      const recentMessages = await redisClient.lRange(`chat:${roomId}:message_queue`, 0, -1);
      logger.debug("Cached recent messages", recentMessages);
      
      if (
        chatRoomUtils.isRoomId(roomId, "global") &&
        recentMessages.length >= MAX_MESSAGES_COUNT.global.cached
      ) {
        logger.debug("Global; Inserting cached chat messages to DB...");
        await GlobalChatMessage(roomId as GlobalChatRoomId).insertMany(recentMessages.map((msg) => JSON.parse(msg)));

        await redisClient.lTrim(`chat:${roomId}:message_queue`, -1, 0); // Clears the cache.
        logger.debug("Global; Successfully archived cached chat messages to DB.");
      } else if (
        chatRoomUtils.isRoomId(roomId, "private") &&
        recentMessages.length >= MAX_MESSAGES_COUNT.private.cached
      ) {
        logger.debug("Private; Inserting cached chat messages to DB...");

        await PrivateChatMessage.updateOne(
          { room_id: roomId },
          { $push: { chats: { $each: recentMessages.map(msg => JSON.parse(msg)) } } },
          {
            upsert: true,
            maxTimeMS: 30000
          }
        );
      
        await redisClient.lTrim(`chat:${roomId}:message_queue`, -1, 0);
        logger.debug("Private; Successfully archived cached chat messages to DB.");
      }
    })
  } catch (error: any) {
    throw handleApiError(error, "archiveChatMessageQueue service error.");
  }
}

/**
 * Gets resent messages from the cache and older messages in the database if any for the provided room and merges them.
 */
export async function getChatMessages(roomId: ChatRoomId): Promise<ChatMessage[]> {
  try {
    let archivedMessages: ChatMessage[];

    if (chatRoomUtils.isRoomId(roomId, "global")) {
      archivedMessages = await GlobalChatMessage(roomId as GlobalChatRoomId)
        .find({ room_id: roomId })
        .select("-_id")
        .lean<any>();
    } else if (chatRoomUtils.isRoomId(roomId, "private")) {
      const privateChat = await PrivateChatMessage.aggregate([
        { $match: { room_id: roomId } },
        { $unwind: "$chats" },
        { $sort: { "chats.created_at": -1 } },
        { $group: { _id: 0, chats: { $push: "$chats" } } }
      ]);

      archivedMessages = privateChat[0]?.chats || [];
    } else {
      throw new SocketError("ACCESS_DENIED_CRED", "general", "forbidden");
    }

    const recentMessages = await redisClient.lRange(`chat:${roomId}:message_queue`, 0, -1);

    return [
      ...recentMessages.map(msg => JSON.parse(msg)),
      ...archivedMessages
    ];
  } catch (error: any) {
    throw handleApiError(error, "getChatMessages service error.");
  }
}
