import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { logger } from "@qc/utils";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import handleRequestByLink from "@services/handleRequestByLink";
import { authEndpoints } from "./authApi";
import { ADD_TOAST } from "@redux/toast/toastSlice";

export default async function handleSendVerifyEmail(
  dispatch: ThunkDispatch<any, any, UnknownAction>,
  triggerId = "toastBtn"
) {
  handleRequestByLink(triggerId, async () => {
    try {
      const { data, error } = await dispatch(authEndpoints.sendVerifyEmail.initiate());
  
      if (error && isFetchBaseQueryError(error)) {
        const err = error as FetchBaseQueryError;
        if (err.status === 541) {
          dispatch(
            ADD_TOAST({
              title: "SMTP Rejected",
              message: err.data!.ERROR,
              intent: "error"
            })
          );
        }
      } else if (data?.success) {
        dispatch(
          ADD_TOAST({
            title: "Verification Pending",
            message: data.message,
            intent: "success"
          })
        );
      }
    } catch (error: any) {
      logger.error("handleSendVerifyEmail error:\n", error.message);
    }
  });
}
