import { useRef } from "react";
import { Outlet } from "react-router-dom";

import { history } from "@utils/History";

import useLocale from "@hooks/useLocale";

import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { selectUserCsrfToken } from "@authFeat/redux/authSelectors";
import { ADD_TOAST } from "@redux/toast/toastSlice";

export default function RestrictView() {
  const redirected = useRef(false),
    { content } = useLocale("RestrictView");

  const userToken = useAppSelector(selectUserCsrfToken),
    dispatch = useAppDispatch();

  if (typeof window !== "undefined" && !userToken && !redirected.current) {
    dispatch(
      ADD_TOAST({
        title: content.title,
        message: content.invalid,
        intent: "error",
        duration: 6500
      })
    );
    if (history.length) history.back({ replace: true }) 
    else history.push("/home", { replace: true });

    redirected.current = true;
    return null;
  }

  return <Outlet />;
}
