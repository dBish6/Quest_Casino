import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";
import type SocketExtendedError from "@qc/typescript/typings/SocketExtendedError";

import { logger } from "@qc/utils";
import { handleSocketMiddlewareError, handleHttpError, SocketError } from "@utils/handleError";

import { JWTVerification } from "@authFeat/services/jwtService";
import initializeSession from "@authFeatHttp/utils/initializeSession";

/**
 * Verifies the access and refresh tokens and also refreshes the session if needed.
 * @middleware This should only be used on routes where the user should already be logged in for.
 * @response `unauthorized`, `forbidden`, or `ApiError`.
 */
export default async function verifyUserToken(
  reqOrSocket: Request | Socket,
  res: Response | null,
  next: NextFunction | ((err?: SocketExtendedError) => void)
) {
  const isSocketIo = !res,
    req = isSocketIo ? (reqOrSocket as any).request : reqOrSocket;

  const accessToken = req.cookies?.session,
    refreshToken = req.cookies?.refresh;

  const jwtVerification = new JWTVerification();

  try {
    const result = await jwtVerification.verifyUserToken(accessToken, refreshToken);

    if (result.threshold) {
      if (!isSocketIo) {
        logger.debug("Threshold reached, refreshing session.");

        const refreshResult = await initializeSession(
          res,
          { by: "_id", value: result.claims.sub },
          req.headers["x-xsrf-token"] as string
        );
        if (typeof refreshResult === "string") 
          return res.status(404).json({
            name: refreshResult,
            ERROR: reqOrSocket.locale.data.auth.error[refreshResult]
          });
        logger.debug("Session refresh was attached to the response.");
      } else {
        throw new SocketError("TOKEN_REFRESH_THRE", "auth", "forbidden");
      }
    }

    reqOrSocket.userDecodedClaims = result.claims;
    logger.debug("Access token successfully verified.");
    next();
  } catch (error: any) {
    isSocketIo
      ? next(handleSocketMiddlewareError(reqOrSocket as Socket, error, "verifyAccessToken middleware error."))
      : next(handleHttpError(error, "verifyAccessToken middleware error.") as any);
  }
}
