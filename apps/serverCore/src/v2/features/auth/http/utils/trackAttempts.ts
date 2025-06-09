import type { ObjectId } from "mongoose";
import type FeatureCategory from "@typings/FeatureCategory";

import { handleHttpError, HttpError } from "@utils/handleError";

import { redisClient } from "@cache";
import { updateUserCredentials} from "@authFeat/services/authService";

import { scheduleUnlockUser } from "@authFeat/jobs/schedule";

/**
 * Monitors and limits the number of user attempts for specific logic, locking the user if the maximum is exceeded.
 * @param callback Function to execute if the attempt limit is exceeded.
 * @param options (Optional) includes the max attempt limit (defaults to 6).
 * @throws `HttpError 429` if the attempt limit is exceeded.
 */
export default async function trackAttempts<TReturn = any>(
  userId: string | ObjectId,
  cacheId: string,
  error: { name: string; category: FeatureCategory },
  callback: () => Promise<any> | any,
  options: { max?: number } = { max: 6 }
) {
  try {
    const cacheKey = `user:${userId.toString()}:${cacheId}`,
      attempts = parseInt((await redisClient.get(cacheKey)) || "0");

    if (attempts >= options.max!) {
      await updateUserCredentials(
        { by: "_id", value: userId },
        { $set: { locked: "attempts" } }
      );

      await scheduleUnlockUser(userId, 60 * 60 * 24 * 1000); // 24 hours from now.

      throw new HttpError(error.name, error.category, 429);
    }

    try {
      const result = await callback() as TReturn;
      return result;
    } catch (error: any) {
      throw error
    } finally {
      await Promise.all([
        redisClient.incr(cacheKey),
        redisClient.expire(cacheKey, 60 * 60 * 24)
      ]);
    }
  } catch (error: any) {
    throw handleHttpError(error, `trackAttempts error for ${cacheId}.`, 500);
  }
}
