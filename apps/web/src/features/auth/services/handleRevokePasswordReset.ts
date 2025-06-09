import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";

import { logger } from "@qc/utils";;

import handleRequestByLink from "@services/handleRequestByLink"
import { authEndpoints } from "./authApi";
import { ADD_TOAST } from "@redux/toast/toastSlice";

export default async function handleRevokePasswordReset(
  dispatch: ThunkDispatch<any, any, UnknownAction>, 
  triggerId = "parsedBtn"
) {
  handleRequestByLink(triggerId, async () => {
    try {
      const res = dispatch(authEndpoints.revokePasswordReset.initiate()),
        { data } = await res;

      if (data?.success)
        dispatch(ADD_TOAST({ message: data.message, intent: "success" }));
    } catch (error: any) {
      logger.error("handleRevokePasswordReset error:\n", error.message);
    }
  });
}
