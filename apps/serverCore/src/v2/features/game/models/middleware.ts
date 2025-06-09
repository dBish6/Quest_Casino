import type { CallbackWithoutResultAndOptionalError } from "mongoose";
import type { UserDocStatistics } from "@authFeat/typings/User";

import { handleApiError, ApiError } from "@utils/handleError";
import { calcWinRate } from "@qc/utils";

import { userStatisticsSchema } from "@authFeat/models/schemas/userSchema";

type WinsOrLossesField = UserDocStatistics["wins"] | UserDocStatistics["losses"];

/**
 * Finds which key (category) was updated and calculates the new total.
 */
function calcTotal(updated: WinsOrLossesField, previous: WinsOrLossesField) {
  let total = previous.total;
  for (const [key, newValue] of Object.entries(updated)) {
    if (!["total", "streak", "rate"].includes(key)) {
      total += newValue - previous[key as keyof WinsOrLossesField]; // Finds the difference.
    }
  }

  return total;
}
/**
 * Adds the new win or loss total, calculates the new win rate, and also add or resets their win streak.
 * @middleware Mongoose
 */
async function handleWinOrLossUpdate(next: CallbackWithoutResultAndOptionalError) {
  const updatedUserStats = this.getUpdate() as Partial<UserDocStatistics>;
  if (!updatedUserStats) return next();

  try {
    const { wins, losses } = updatedUserStats;

    if (wins || losses) {
      const user = await this.model.findOne(this.getQuery(), {
        projection: "-_id wins losses",
        lean: true
      });
      if (!user)
        throw new ApiError(
          "USER_NOT_FOUND_STATISTICS_UPDATING",
          "auth",
          404,
          "not found"
        );

      // Only either the wins or the losses can be updated at a time.
      if (wins) {
        const winsTotal = calcTotal(wins, user.wins);

        this.setUpdate({
          ...updatedUserStats,
          "wins.total": winsTotal,
          "wins.streak": user.wins.streak + 1,
          "wins.rate": calcWinRate(winsTotal, user.losses.total)
        });
      } else if (losses) {
        const lossesTotal = calcTotal(losses, user.losses);

        this.setUpdate({
          ...updatedUserStats,
          "losses.total": lossesTotal,
          "wins.streak": 0,
          "wins.rate": calcWinRate(user.wins.total, lossesTotal)
        });
      }
    }

    next();
  } catch (error: any) {
    next(handleApiError(error, "handleWinOrLossUpdate mongoose middleware error."));
  }
}
userStatisticsSchema.pre("updateOne", handleWinOrLossUpdate);
userStatisticsSchema.pre("findOneAndUpdate", handleWinOrLossUpdate);
