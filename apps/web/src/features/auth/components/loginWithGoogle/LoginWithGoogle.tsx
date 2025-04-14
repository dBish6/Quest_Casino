import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

import parsePathWithLocale from "@utils/parsePathWithLocale";

import { useAppSelector } from "@redux/hooks";
import { selectUserOStateToken } from "@authFeat/redux/authSelectors";

import { Button } from "@components/common/controls";
import { Link, Icon } from "@components/common";
import { Spinner } from "@components/loaders";

import s from "./loginWithGoogle.module.css";

import { LoginGoogleTriggerType } from "@authFeat/services/authApi";

export interface LoginWithGoogleProps {
  queryKey: "register" | "login";
  postLoginGoogle: LoginGoogleTriggerType;
  setGoogleLoading: React.Dispatch<React.SetStateAction<boolean>>;
  processing: {
    google: boolean;
    form: boolean;
    all: boolean;
  };
}

/**
 * Google login button with divider, including logic for the Google OAuth redirect callback.
 *
 * Meant to be used with a Form.
 */
export default function LoginWithGoogle({
  queryKey,
  postLoginGoogle,
  setGoogleLoading,
  processing
}: LoginWithGoogleProps) {
  const [searchParams] = useSearchParams(),
    code = searchParams.get("code");

  const storedOState = useAppSelector(selectUserOStateToken),
    redirectUri = `${import.meta.env.VITE_APP_URL}/?${queryKey}=true`;

  const createGoogleOAuthUrl = () => {
    const scope = "email profile",
      state = storedOState?.original;

    if (!code) localStorage.setItem("qc:prev_path", parsePathWithLocale(window.location.pathname)![2]);
    return `https://accounts.google.com/o/oauth2/auth?client_id=${import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
  };

  const handleCallback = () => {
    setGoogleLoading(true);

    const mutation = postLoginGoogle({
      code: code!,
      state: searchParams.get("state") || "",
      secret: storedOState?.secret,
      redirect_uri: redirectUri
    });
    mutation.finally(() => setGoogleLoading(false));
    return mutation;
  };

  useEffect(() => {
    if (code) {
      let mutation: ReturnType<typeof handleCallback> | null = null;
      const timeout = setTimeout(() => {
        mutation = handleCallback();
      }, 1000);

      return () => {
        clearTimeout(timeout);
        if (mutation) mutation.abort();
      };
    };
  }, [code]);

  return (
    <>
      <div className={s.or}>
        <span />
        <p
          id="logWit"
          aria-label="Or register/login with other third-party services."
        >
          Or Login With
        </p>
        <span />
      </div>
      <Button
        asChild
        aria-label="Google"
        aria-describedby="logWit"
        aria-live="polite"
        intent="secondary"
        size="xl"
        className={s.google}
        disabled={processing.all}
      >
        <Link to={createGoogleOAuthUrl()} external>
          {processing.google ? (
            <Spinner intent="primary" size="md" />
          ) : (
            <>
              <Icon aria-hidden="true" id="google-24" /> Google
            </>
          )}
        </Link>
      </Button>
    </>
  );
}
