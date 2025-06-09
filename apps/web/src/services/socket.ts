import type { Socket } from "socket.io-client";
import type { SocketResponse } from "@typings/ApiResponse";
import type { AppDispatch } from "@redux/store";
import type SocketExtendedError from "@qc/typescript/typings/SocketExtendedError";

import { io } from "socket.io-client";
import { throttle } from "tiny-throttle";

import { logger } from "@qc/utils";
import { history } from "@utils/History";

import { authEndpoints } from "@authFeat/services/authApi";
import { authTokenExpiredToast } from "@redux/toast/toastSlice";
import { attemptLogout } from "@authFeat/services/handleLogout";

export const namespaces = ["auth", "chat", "game"] as const;
export type SocketNamespaces = (typeof namespaces)[number];
export type TimeoutObj = Partial<Record<SocketNamespaces, NodeJS.Timeout>>;

// const baseUrl = "/socket/v2/socket",
const baseUrl = `${import.meta.env.VITE_API_URL}/socket`;

const socketInstances: Partial<Record<SocketNamespaces, Socket>> = {};

/**
 * Creates a socket instance only once for a specific namespace.
 */
export function getSocketInstance(namespace: SocketNamespaces) {
  if (!socketInstances[namespace]) {
    const socket = io(`${baseUrl}/${namespace}`, {
      autoConnect: false,
      reconnection: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
      query: {
        lang: typeof document !== "undefined" ? document.documentElement.lang : ""
      }
    });

    socketInstances[namespace] = socket;
  }

  return socketInstances[namespace];
}

export function emitAsPromise(socket: Socket) {
  return <TData extends object>(event: string, data: TData): Promise<any> => {
    return new Promise((resolve) => {
      socket.emit(event, data, (res: SocketResponse<TData>) => {
        if (res.status !== "ok") {
          // Mimics the structure of what RTK does for their FetchBaseQueryError.
          const { status, ...rest } = res;
          resolve({ error: { data: { ...rest }, status } });
        } else {
          resolve({ data: res });
        }
      });
    });
  };
}

// So all namespaces waits for the one request (the connections happen concurrently for a quicker resolve).
const onGoingRequest: {
  refresh: Promise<any> | null;
  logout: Promise<any> | null;
} = { refresh: null, logout: null };

const throttledLogoutFinally = throttle(
  (dispatch: AppDispatch, socket: Socket, reject: (reason?: any) => void) => {
    onGoingRequest.logout = null;
    dispatch(authTokenExpiredToast());
    socket.removeAllListeners();
    reject();
  },
  1000
);
/**
 * Establishes connections to the host for all socket instances and handles retries up to 9 times if the connection fails. Ensures all socket
 * instances are set up appropriately.
 */
export async function socketInstancesConnectionProvider(
  timeoutObj: TimeoutObj,
  username: string,
  dispatch: AppDispatch
) {
  const connections = namespaces.map(async (namespace) => {
    const socket = getSocketInstance(namespace);

    return new Promise<{ socket: Socket; namespace: SocketNamespaces }>((resolve, reject) => {
        let retries = 9;

        if (socket.connected) {
          resolve({ socket, namespace });
        } else {
          socket
            .on("connect", () => {
              logger.info(
                `Connection established for ${namespace} socket${import.meta.env.DEV ? `; ${socket.id}` : "."}`
              );

              socket.removeAllListeners();
              resolve({ socket, namespace });
            })
            // @ts-ignore
            .on("connect_error", async (error: SocketExtendedError) => {
              const err = error.data;
              logger.error(`${namespace} socket instance connection error:\n`, err || error.message);

              // Sockets verify the tokens on the connection attempts.
              if (["unauthorized", "forbidden"].includes(err?.status)) {
                if (err.name === "TOKEN_REFRESH_THRE") {
                  if (!onGoingRequest.refresh)
                    onGoingRequest.refresh = dispatch(
                      authEndpoints.refresh.initiate({ username })
                    ).unwrap();

                  await onGoingRequest.refresh
                    .then(() => retry(true))
                    .catch(async () => logout())
                    .finally(() => (onGoingRequest.refresh = null));
                } else if (
                  err.name.includes("EXPIRED") || err.name.includes("MISSING")
                ) {
                  await logout();
                } else {
                  if (err.status === "unauthorized") history.push("/error-401");
                  else history.push("/error-403");
                  socket.removeAllListeners();
                  reject();
                }
              } else {
                retry();
              }
            });
          const attemptConnection = (plus1?: boolean) => {
              if (!plus1) retries--;

              logger.debug(
                `${namespace} socket instance attempting to establish a connection; ${retries} retries left...`
              );
              socket.connect();

              if (retries === 0) {
                socket.removeAllListeners();
                reject(
                  new Error(
                    `Failed to establish a stable connection with ${namespace} socket instance.`
                  )
                );
              }
            },
            retry = (plus1?: boolean) => {
              const timeout = setTimeout(() => attemptConnection(plus1), 5000);
              timeoutObj[namespace] = timeout;
            };

          /** Logs out and prompts to login. */
          const logout = async () => {
            if (!onGoingRequest.logout)
              onGoingRequest.logout = attemptLogout(dispatch, username);
          
            await onGoingRequest.logout.finally(() => throttledLogoutFinally(dispatch, socket, reject));
          };

          attemptConnection(); // Init
        }
      }
    ).then(({ socket, namespace }) => setupDefaultListeners(socket, namespace));
  });

  await Promise.all(connections);
  setupDebugger()
}

function setupDebugger() {
  if (import.meta.env.MODE !== "production") {
    const socket = getSocketInstance("auth"), // They all use the same engine.
      engineLogs = false;

    if (engineLogs) {
      socket.io.engine
        .on("packet", ({ type, data }) =>
          logger.debug("Socket received:", { type: type, data: data })
        )
        .on("packetCreate", ({ type, data }) =>
          logger.debug("Socket sent:", { type: type, data: data })
        );
    }
  }
}

function setupDefaultListeners(socket: Socket, namespace: SocketNamespaces) {
  socket.on("connect_error", (error) =>
    logger.error(
      `Unexpected error occurred from ${namespace} socket instance:\n`, error.message
    )
  );

  socket.on("disconnect", () => {
    // TODO:
    logger.info("DISCONNECTING")
  });
}
