/**
 * Socket.io Entry File
 *
 * Description:
 * Setup for the server's websocket connection and namespaces.
 */

import type { CorsOptions } from "cors";
import type { Server as HttpServer } from "http";

import { Server as SocketServer } from "socket.io";
import cookieParser from "cookie-parser";

import { logger } from "@qc/utils";
import { handleSocketMiddlewareError } from "@utils/handleError";
import getLocale from "@utils/getLocale";

import { redisClient } from "@cache";

import verifyUserToken from "@authFeat/middleware/tokens/verifyUserToken";
import userVerificationRequired from "@authFeat/middleware/userVerificationRequired";

import authNamespace from "@authFeatSocket/namespaces/authNamespace";
import chatNamespace from "@chatFeatSocket/namespaces/chatNamespace";
import gameNamespace from "@gameFeatSocket/namespaces/gameNamespace";
import { localeChangeListener } from "@authFeat/socket/services/SocketAuthService";

const baseUrl = "/api/v2/socket",
  namespaces = [
    { nsp: `${baseUrl}/auth`, handler: authNamespace },
    { nsp: `${baseUrl}/chat`, handler: chatNamespace },
    { nsp: `${baseUrl}/game`, handler: gameNamespace }
  ] as const;

export default function initializeSocketIo(
  httpServer: HttpServer,
  corsOptions?: CorsOptions
) {
  const io = new SocketServer(httpServer, {
    cors: corsOptions
  });

  io.engine.use(cookieParser());

  for (const { nsp, handler } of namespaces) {
    const feature = nsp.split("/")[4];

    // *Middleware*
    io.of(nsp).use((socket, next) => {
      // Locale initialization
      try {
        const locale = socket.handshake.query.lang;

        getLocale(locale as string, socket);

        logger.debug(`Successfully initialized local data for ${feature} namespace.`);
        next();
      } catch (error: any) {
        next(handleSocketMiddlewareError(socket, error, "socketGetLocale middleware error."));
      }
    });
    io.of(nsp).use((socket, next) => verifyUserToken(socket, null, next));
    io.of(nsp).use((socket, next) => userVerificationRequired(socket, null, next));

    // *Namespaces*
    io.of(nsp).on("connection", async (socket) => {
      await redisClient.sAdd(
        `user:${socket.userDecodedClaims!.member_id}:${feature}:socket_ids`, socket.id
      );

      if (feature === "auth") {
        logger.debug(`Client connected to auth namespace; ${socket.id}`);
        authNamespace(socket, io.of(`${baseUrl}/auth`));

        localeChangeListener(socket, io, namespaces);
      } else {
        handler(socket, io.of(nsp));
        logger.debug(`Client connected to ${feature} namespace; ${socket.id}.`);
      }
    });
  };
}
