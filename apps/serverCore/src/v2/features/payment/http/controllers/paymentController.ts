/**
 * Payment Controller
 *
 * Description:
 * Handles payment related HTTP requests and responses for a user's donations and payment history.
 */

import type { Request, Response, NextFunction } from "express";

import { type TransactionType, TRANSACTION_TYPES } from "@qc/constants";

import { handleHttpError } from "@utils/handleError";

import * as paymentService from "@paymentFeatHttp/services/paymentService";

/**
 * Processes deposits and withdraws.
 * @controller
 * @response `success`, or `HttpError`.
 */
export async function transaction(
  req: Request<{}, {}, { amount: number }>,
  res: Response,
  next: NextFunction
) {
  const type = req.query.type as TransactionType;

  try {
    if (typeof type !== "string" || !TRANSACTION_TYPES.includes(type))
      return res.status(400).json({
        name: "NO_DATA_INVALID",
        ERROR: req.locale.data.general.error.NO_DATA_INVALID
      });

    const user = await paymentService.transaction(
      req.userDecodedClaims!.sub,
      type,
      req.body.amount
    );

    return res.status(200).json({ message: `Successful ${type}.`, user });
  } catch (error: any) {
    next(handleHttpError(error, "deposit controller error."));
  }
}

/**
 * Sends the user's payment history.
 * @controller
 * @response `success` with client formatted games, or `HttpError`.
 */
export async function getPaymentHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const history = await paymentService.getPaymentHistory(req.userDecodedClaims!.sub);

    return res.status(200).json({
      message: "Payment history successfully retrieved.",
      user: history
    });
  } catch (error: any) {
    next(handleHttpError(error, "getPaymentHistory controller error."));
  }
}
