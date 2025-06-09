/**
 * HTTP Payment Service
 *
 * Description:
 * Handles HTTP-related functionalities related to payments for a user's donations and payment history.
 */

import type { ObjectId } from "mongoose";
import type { TransactionType } from "@qc/constants";

import { Types, startSession } from "mongoose"

import { handleHttpError, HttpError } from "@utils/handleError";
import handleMultipleTransactionPromises from "@utils/handleMultipleTransactionPromises";

import { UserActivity } from "@authFeat/models";
import { updateUserCredentials, updateUserActivity } from "@authFeat/services/authService";

/**
 * Updates the user's balance and adds to their `payment_history` for deposits or withdrawals.
 */
export async function transaction(
  userId: ObjectId | string,
  type: TransactionType,
  amount: number
) {
  try {
    const session = await startSession();

    const user = await session.withTransaction(async () => {
      const [user] = await handleMultipleTransactionPromises([
        updateUserCredentials(
          { by: "_id", value: userId },
          { $inc : { balance: type === "deposit" ? amount : -amount } },
          { session, new: true, projection: "-_id balance", lean: true }
        ),
        updateUserActivity(
          { by: "_id", value: userId },
          { $push: { payment_history: { type, amount } } },
          { session, runValidators: true }
        )
      ]);

      return user;
    }).finally(() => session.endSession());

    return user;
  } catch (error: any) {
    throw handleHttpError(error, "deposit service error.");
  }
}

/**
 * Gets a user's payment history from the database sorted by timestamp.
 */
export async function getPaymentHistory(userId?: ObjectId | string) {
  try {
    const history = await UserActivity.aggregate([
      { $match: { _id: new Types.ObjectId(userId as string) } },
      { $unwind: "$payment_history" },
      { $sort: { "payment_history.timestamp": -1 } },
      {
        $group: {
          _id: 0,
          payment_history: { $push: "$payment_history" }
        }
      },
      { $project: { _id: 0, payment_history: 1 } }
    ]);
    if (!history?.length) throw new HttpError("USER_NOT_FOUND_VAL", "general", 404);

    return history[0];
  } catch (error: any) {
    throw handleHttpError(error, "getPaymentHistory service error.");
  }
}
