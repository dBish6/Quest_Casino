import type { CallbackWithoutResultAndOptionalError, Model } from "mongoose";
import type { UserDocActivity } from "@authFeat/typings/User";

import MAX_FRIENDS_COUNT from "@authFeat/constants/MAX_FRIENDS_COUNT";
import MAX_ACTIVITY_HISTORY_COUNT from "@authFeat/constants/MAX_ACTIVITY_HISTORY_COUNT";

import { ApiError, handleApiError } from "@utils/handleError";

import userSchema, { userFriendsSchema, userActivitySchema } from "./schemas/userSchema";

interface MongoError extends Error {
  code: number;
  keyPattern: any;
}

/**
 * @middleware Mongoose
 */
function handleUniqueUsername(
  monError: Error,
  _: any,
  next: CallbackWithoutResultAndOptionalError
) {
  const error = monError as MongoError;
  if (error.code === 11000 && error.keyPattern?.username)
    throw new ApiError("USERNAME_TAKEN", "auth", 409, "conflict");

  next();
}
userSchema.post("save", { errorHandler: true }, handleUniqueUsername);
userSchema.post("updateOne", { errorHandler: true }, handleUniqueUsername);
userSchema.post("findOneAndUpdate", { errorHandler: true }, handleUniqueUsername);

/**
 * Checks if the max of the user's friends list or pending friends has exceeded.
 * @middleware Mongoose
 */
async function handleMaxFriends(next: CallbackWithoutResultAndOptionalError) {
  try {
    const update = this.getUpdate();

    for (const type of ["pending", "list"] as const) {
      if (update[type]) {
        const exceeded = await this.model.aggregate([
          { $match: this.getQuery() },
          { $match: { [type]: { $gt: MAX_FRIENDS_COUNT[type] } } }
        ]);
        if (exceeded.length) {
          throw new ApiError(
            "MAX_FRIENDS",
            "auth",
            400,
            "bad request",
            { var: { count: MAX_FRIENDS_COUNT[type], type: type === "list" ? "friends" : "friend requests" } }
          );
        }
      }
    }

    next();
  } catch (error: any) {
    next(handleApiError(error, "handleMaxFriends mongoose middleware error."));
  }
}
userFriendsSchema.pre("updateOne", handleMaxFriends);
userFriendsSchema.pre("findOneAndUpdate", handleMaxFriends);

/**
 * Checks if the max of the user's activity histories has exceeded.
 * @middleware Mongoose
 */
async function handleMaxActivityHistory(next: CallbackWithoutResultAndOptionalError) {
  try {
    const query = this.getQuery(),
      userActivityModel = this.model as Model<UserDocActivity>;

    for (const type of ["game_history", "payment_history"] as const) {
      const result = await userActivityModel.aggregate([
        { $match: query },
        {
          $set: {
            [type]: {
              // Maintains the max, cutting the oldest.
              $slice: [`$${type}`, -MAX_ACTIVITY_HISTORY_COUNT[type]] // We use $push to insert, so the array will always be sorted oldest to newest (1).
            }
          }
        },
        { $project: { [type]: 1 } }
      ]);

      if (result.length > 0) {
        await userActivityModel.updateOne(query, {
          $set: { [type]: result[0][type] }
        });
      }
    }

    next();
  } catch (error: any) {
    next(handleApiError(error, "handleMaxActivityHistory mongoose middleware error."));
  }
}
userActivitySchema.pre("updateOne", handleMaxActivityHistory);
userActivitySchema.pre("findOneAndUpdate", handleMaxActivityHistory);
