/**
 * Quest Casino API (back-end)
 * Version: 2.0.0-pre
 *
 * Author: David Bishop
 * Creation Date: April 16, 2024
 * Last Updated: June 8, 2025
 *
 * Description:
 * ...
 *
 * Features:
 *  - Authentication:
 *    - Json Web Tokens and cookies for session.
 *    - Support for multiple sessions.
 *    - Access and refresh tokens.
 *  - Real-time chat using Socket.io.
 *  ...
 *
 * Change Log (Not yet, when it's released it would be):
 * The log is in the changelog.txt file at the base of this serverCore directory.
 */

import { createServer } from "http";

import Db from "@model/Db";
import establishRedisConnection from "./cache";
import initializeHttp from "./http";
import initializeSocketIo from "./socket";
import bree from "./jobs";

import { logger } from "@qc/utils";
import getCountriesMap from "@utils/getCountriesMap";

export async function setupServer() {
  const { PROTOCOL, HOST, PORT: ENV_PORT } = process.env,
    PORT = Number(ENV_PORT) || 4000,
    corsOptions = {
      origin: ["http://localhost:3000"],
      credentials: true
    };

  await new Db().connectBaseCluster();

  await establishRedisConnection();

  const app = initializeHttp(corsOptions),
    httpServer = createServer(app);

  initializeSocketIo(httpServer, corsOptions);

  httpServer.listen(PORT, HOST!, async () => {
    try {
      logger.info(
        `Server is running on ${PROTOCOL}${HOST}:${PORT}; Ctrl-C to terminate...`
      );
    } catch (error: any) {
      logger.error("Server start error:\n" + error.message);
    }
  });
};
setupServer().then(async () => {
  // Starts predefined jobs.
  await bree.start();
  logger.info("Bree jobs started.");

  // Just so countries can be initialized.
  await getCountriesMap();
});
