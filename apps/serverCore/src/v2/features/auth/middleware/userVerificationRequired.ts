import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";
import type SocketExtendedError from "@qc/typescript/typings/SocketExtendedError";

import { logger } from "@qc/utils";
import { handleSocketMiddlewareError, handleHttpError, SocketError } from "@utils/handleError";

/**
 * Restricts access where a verified user is required.
 * @middleware
 * @response `forbidden`, or `ApiError`.
 */
export default async function userVerificationRequired(
  reqOrSocket: Request | Socket,
  res: Response | null,
  next: NextFunction | ((err?: SocketExtendedError) => void)
) {
  const isSocketIo = !res;
  
  try {
    const user = reqOrSocket.userDecodedClaims!;

    if (!user.email_verified) {
      if (isSocketIo) throw new SocketError("USER_VERIFICATION", "auth", "unauthorized"); // 401 (unauthorized) for socket because you must be verified to establish a connection with a socket instance.
      else
        return res.status(403).json({
          ERROR: reqOrSocket.locale.data.auth.error.USER_VERIFICATION
        });
    }

    logger.debug(`User ${user.sub} is verified.`);
    next();
  } catch (error: any) {
    isSocketIo
      ? next(handleSocketMiddlewareError(reqOrSocket as Socket, error, "validateLogin middleware error."))
      : next(handleHttpError(error, "validateLogin middleware error.") as any);
  }
}
