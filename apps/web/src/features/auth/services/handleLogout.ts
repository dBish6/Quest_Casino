import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import type { Socket } from "socket.io-client";
import type { SetURLSearchParams } from "react-router-dom";
import type { LogoutResponseDto } from "@authFeat/dtos/LogoutResponseDto";

import { logger } from "@qc/utils";

import handleRequestByLink from "@services/handleRequestByLink";
import { authEndpoints } from "./authApi";
import apiEntry from "@services/getLocaleEntry";

import { getSocketInstance } from "@services/socket";
import { CLEAR_USER, SET_OSTATE_TOKEN } from "@authFeat/redux/authSlice";
import { CLEAR_CHAT } from "@chatFeat/redux/chatSlice";
import { ADD_TOAST } from "@redux/toast/toastSlice";

export default async function handleLogout(
  dispatch: ThunkDispatch<any, any, UnknownAction>,
  socket: Socket,
  oState: LogoutResponseDto["oState"] | undefined
) {
  try {
    dispatch(CLEAR_USER());
    dispatch(CLEAR_CHAT());

    socket.disconnect();
    getSocketInstance("chat").disconnect();

    if (oState) dispatch(SET_OSTATE_TOKEN(oState));
    dispatch(
      ADD_TOAST({
        message: apiEntry("logout").success.message,
        intent: "info",
        duration: 6500
      })
    );
  } catch (error: any) {
    logger.error("handleLogout error:\n", error.message);
  }
}

export async function handleLogoutButton(
  dispatch: ThunkDispatch<any, any, UnknownAction>,
  username: string,
  triggerId: string
) {
  handleRequestByLink(triggerId, async () => {
    try {
      await dispatch(authEndpoints.logout.initiate({ username }));
    } catch (error: any) {
      logger.error("handleLogoutButton error:\n", error.message);
    }
  });
}

export async function attemptLogout(
  dispatch: ThunkDispatch<any, any, UnknownAction>,
  username: string,
  setSearchParams?: SetURLSearchParams
) {
  let res: any;

  const attempt = async () => {
    const docStyle = document.documentElement.style;
    docStyle.pointerEvents = "none";
    docStyle.cursor = "wait";

    res = await dispatch(authEndpoints.logout.initiate({ username, lax: true }))
      .finally(() => {
        docStyle.pointerEvents = "";
        docStyle.cursor = "";
        if (setSearchParams) setSearchParams({});
      });
  };

  await attempt().catch(async () =>
    // Even when it errors, we try again, but even if that fails we clear the user anyways, we need to get them out of here.
    await attempt().catch(() => handleLogout(dispatch, getSocketInstance("auth"), res.data?.oState))
  );
}
