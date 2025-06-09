import { useSearchParams } from "react-router-dom";

import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";

import { useAppSelector } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";
import { useEmailVerifyMutation, useResetPasswordMutation } from "@authFeat/services/authApi";

import { OverlayLoader } from "@components/loaders";

export default function VerificationHandler() {
  const [searchParams, setSearchParams] = useSearchParams();

  const user = useAppSelector(selectUserCredentials),
    [postEmailVerify, { isLoading: emailLoading }] = useEmailVerifyMutation(),
    [postResetPassword, { isLoading: resetLoading }] = useResetPasswordMutation(),
    isLoading = emailLoading || resetLoading;

  // They'll be redirected when still signed in from the email.
  useResourcesLoadedEffect(() => {
    if (user?.email_verified === false) {
      const emailVerifyToken = searchParams.get("prof-ver");
      if (emailVerifyToken) {
        const mutation = postEmailVerify({ verification_token: emailVerifyToken });
        mutation.then((res) => {
          if (res.data?.success)
            setSearchParams((params) => {
              params.delete("prof-ver");
              return params;
            });
        });
        return () => mutation.abort();
      }
    }

    const confirmResetPasswordToken = searchParams.get("conf-ver");
    if (confirmResetPasswordToken) {
      const mutation = postResetPassword({ verification_token: confirmResetPasswordToken });
      mutation.then((res) => {
        if (res.data?.success)
          setSearchParams((params) => {
            params.delete("conf-ver");
            return params;
          });
      });
      return () => mutation.abort();
    }
  }, []);

  return isLoading ? <OverlayLoader message="Verifying..." /> : null;
}
