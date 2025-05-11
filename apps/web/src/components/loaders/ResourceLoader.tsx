import type { FeatureBundle } from "framer-motion";
import type { TimeoutObj } from "@services/socket";

import { createContext, useRef, useState, useLayoutEffect } from "react";
import { LazyMotion } from "framer-motion";

import useLocale from "@hooks/useLocale";

import { logger, delay } from "@qc/utils";
import { history } from "@utils/History";

import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { selectUserCsrfToken, selectUserCredentials } from "@authFeat/redux/authSelectors";
import { UPDATE_USER_FRIENDS } from "@authFeat/redux/authSlice";
import { useInitializeFriendsMutation } from "@authFeat/services/authApi";

import { socketInstancesConnectionProvider } from "@services/socket";

import OverlayLoader from "./overlay/OverlayLoader";

export interface ResourceLoaderContextValues {
  resourcesLoaded: boolean | undefined;
}

export const ResourceLoaderContext = createContext<ResourceLoaderContextValues | undefined>(undefined);

export default function ResourceLoaderProvider({ children }: React.PropsWithChildren<{}>) {
  const { content } = useLocale("ResourceLoader");

  const framerFeatureBundleRef = useRef<FeatureBundle>(),
    [progress, setProgress] = useState({
      loading: false, // I would love to show the loader initially but the portal in OverlayLoader breaks hydration.
      message: content.para[0]
    });

  const userToken = useAppSelector(selectUserCsrfToken),
    user = useAppSelector(selectUserCredentials),
    dispatch = useAppDispatch();

  const mutation = useRef<any>(),
    [emitInitFriends] = useInitializeFriendsMutation();

  const initializeFriends = async () => {
    mutation.current = emitInitFriends({ member_id: user!.member_id! });
    mutation.current.then((res: any) => {
      if (res.data?.status === "ok") dispatch(UPDATE_USER_FRIENDS(res.data.friends));
    })
  }

  if (typeof window !== "undefined") {
    useLayoutEffect(() => {
      if (!progress.loading) {
        setProgress((prev) => ({ ...prev, loading: true }));
        const timeoutObj: TimeoutObj = {};

        (async () => {
          try {
            if (!framerFeatureBundleRef.current) {
              const { domMax } = await import("framer-motion");

              framerFeatureBundleRef.current = domMax;
              await delay(1500);
            }

            setProgress((prev) => ({ ...prev, message: content.para[1] }));
            delay(29000, () => {
              if (!progress.loading)
                setProgress((prev) => ({ ...prev, message: content.para[2] }));
            });
            if (user?.email_verified) {
              // The user must be verified to establish socket connection.
              await socketInstancesConnectionProvider(timeoutObj, user.username, dispatch);
              await initializeFriends();
            }
          } catch (error: any) {
            logger.error("Loading resources error:\n", error.message);
            if (error.message.includes("stable connection")) history.push("/error-500");
          } finally {
            setProgress((prev) => ({ ...prev, loading: false }));
          }
        })();

        return () => {
          Object.values(timeoutObj).forEach((timeout) => clearTimeout(timeout));
          if (mutation.current) mutation.current.abort();
        };
      }
    }, [userToken, user?.email_verified]);
  }

  return (
    <ResourceLoaderContext.Provider value={{ resourcesLoaded: framerFeatureBundleRef.current && progress.loading === false }}>
      {progress.loading && <OverlayLoader message={progress.message} />}
      <LazyMotion features={framerFeatureBundleRef.current! || {}} strict>
        {children}
      </LazyMotion>
    </ResourceLoaderContext.Provider>
  );
};
