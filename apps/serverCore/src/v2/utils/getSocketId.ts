import type FeatureCategory from "@typings/FeatureCategory";

import { SocketError } from "@utils/handleError";
import { redisClient } from "@cache";

/**
 * Retrieves the auth namespace socket ID for a connected user.
 * @throws `SocketError not found` only when the `isCurrentUser` parameter is true.
 */
export default async function getSocketId(memberId: string, feature: FeatureCategory, isCurrentUser?: boolean) {
  const socketId = await redisClient.sMembers(`user:${memberId}:${feature}:socket_ids`);
  if (isCurrentUser && !socketId)
    throw new SocketError("GET_SOCKET_ID", "auth", "not found");

  return socketId;
}
