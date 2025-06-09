import type { Middleware, SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { isRejected } from "@reduxjs/toolkit";

import { logger } from "@qc/utils";
import apiEntry from "./getLocaleEntry";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";
import { history } from "@utils/History";

import { ADD_TOAST, unexpectedErrorToast } from "@redux/toast/toastSlice";
import { UPDATE_USER_CREDENTIALS } from "@authFeat/redux/authSlice";

export const apiErrorHandler: Middleware =
  ({ dispatch }) => (next) => (action) => {
    if (isRejected(action)) {
      const [reducerName, actionType] = action.type.split("/"),
        payload = action.payload as | FetchBaseQueryError | SerializedError | undefined;

      const log = () => {
        if (payload) {
          logger.error(
            `${reducerName} ${actionType} ${(payload as SerializedError).code ? "serialization" : "response"} error:\n`,
            (payload as FetchBaseQueryError).status || (payload as SerializedError).code
          );
        }
      };

      if (isFetchBaseQueryError(payload)) {
        logger.debug("ERROR PAYLOAD:", action.payload);

        // Socket error responses send string statuses.
        switch (payload.status) {
          case 401:
          case 403:
            if (payload.data?.name === "USER_VERIFICATION") {
              return dispatch(
                ADD_TOAST({
                  title: apiEntry("errorHandler").verification,
                  message: payload.data.ERROR,
                  intent: "error",
                  options: {
                    inject: {
                      linkTo: "/profile",
                      localeMarker: true
                    }
                  }
                })
              );
            } else {
              if (!(payload.data?.name || "").includes("VERIFY")) history.push(`/error-${payload.status}`)
            }
          break;

          // Access/refresh token errors for sockets happen on the initial connect, it can be found in socket.ts.
          case "unauthorized":
            history.push("/error-401");
            break;
          case "forbidden":
            history.push("/error-403");
            break;

          case 404:
          case "not found":
            if (payload.data?.name?.includes("USER_NOT_FOUND")) history.push("/error-404-user");
            break;

          case 429:
            if (payload.data?.name?.includes("ATTEMPTS")) {
              return dispatch(UPDATE_USER_CREDENTIALS({ locked: "attempts" }));
            } else {
              history.push("/error-429");
            }
            break;

          case 400:
          case "bad request":
            if (payload.data?.name === "NO_DATA" || payload.data?.name === "NO_DATA_INVALID")
              history.push("/error-500");
            break;

          default:
            log();
            // 500 errors and socket's internal error.
            if (
              !payload.data?.allow &&
              (parseInt(payload.status as any, 10) >= 500 || payload.status === "internal error")
            )
              dispatch(
                unexpectedErrorToast(apiEntry().error.unexpectedServer)
              );

            break;
        }
      } else if (payload?.message) {
        log();

        const message = payload.message;
        dispatch(
          unexpectedErrorToast(`${message.length > 30 ? `${message.slice(0, 30)}...` : message}.`)
        );
      }
    }

    return next(action);
  };
