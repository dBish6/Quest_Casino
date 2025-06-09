import { useSearchParams, Navigate } from "react-router-dom";
import { useMemo } from "react";

import useLocale from "@hooks/useLocale";

import { useAppDispatch } from "@redux/hooks";
import { unexpectedErrorToast } from "@redux/toast/toastSlice";

const isJwtString = (token: string) => /^([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_=]+)\.([a-zA-Z0-9_\-\+\/=]*)$/.test(token);

export default function verTokenRequiredView<TProps extends object>(
  Component: React.ComponentType<TProps>,
  param = "reset"
) {
  return function (props: TProps) {
    const { content } = useLocale("verTokenRequiredView");

    const [searchParams] = useSearchParams(),
      token = searchParams.get(param) || ""
    const dispatch = useAppDispatch();

    const isTokenValid = useMemo(() => isJwtString(token), [token]);

    if (token && !isTokenValid) {
      dispatch(
        unexpectedErrorToast(
          content.invalid.replace("{{param}}", content[param]),
          false
        )
      );
      return <Navigate to="/error-401" replace />;
    }

    return <Component {...props} />;
  };
}
