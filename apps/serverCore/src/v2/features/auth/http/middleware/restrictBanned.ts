import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";
import type SocketExtendedError from "@qc/typescript/typings/SocketExtendedError";

import { logger } from "@qc/utils";
import { handleSocketMiddlewareError, handleHttpError } from "@utils/handleError";

/**
 * TODO:
 * @middleware
 * @response `forbidden`, or `ApiError`.
 */
export default async function restrictBanned(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.userDecodedClaims!;

    // if (!user.banned === "suspicious") {
    //   return res.status(401).json({
    //     ERROR: "CSRF token is missing."
    //   });
    // } else if ([""])

    logger.debug(`User ${user.sub} is not banned.`);
    next();
  } catch (error: any) {
    next(handleHttpError(error, "restrictBanned middleware error."));
  }
}
