import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import { useLayoutEffect, useEffect, useState } from "react";

import { history } from "@utils/History";

import useLocale from "@hooks/useLocale";
import useBreakpoint from "@hooks/useBreakpoint";

import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";
import { ADD_TOAST } from "@redux/toast/toastSlice";

import { useLazyGetUserProfileQuery } from "@authFeat/services/authApi";
import handleSendVerifyEmail from "@authFeat/services/handleSendVerifyEmail";

import { Main } from "@components/dashboard";
import { OverlayLoader } from "@components/loaders";
import { ScrollArea } from "@components/scrollArea";
import { Blob } from "@components/common";
import { Button } from "@components/common/controls";
import { Facing, Personal, Billing } from "./_components/edit";
import { Statistics, Activity } from "./_components/stats&activity";

import s from "./profile.module.css";

export default function Profile() {
  const { content, numberFormat } = useLocale(),
    { viewport } = useBreakpoint()

  const storedUser = useAppSelector(selectUserCredentials)! || {},
    dispatch = useAppDispatch();

  const [ getUserProfile, { isFetching: profileLoading }] = useLazyGetUserProfileQuery(),
    [user, setUser] = useState<UserProfileCredentials | null>(null);

  if (typeof window !== "undefined") {
    useLayoutEffect(() => {
      const chatAsideBreakpointProfile = parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--chat-aside-breakpoint-profile")
            .trim()
            .split("px")[0],
          10
        ),
        elems = document.querySelectorAll<HTMLDivElement>(".scrollMain, #asideDrawer");

      const handleBreakpoint = () => {
        if (window.innerWidth <= chatAsideBreakpointProfile) {
          elems.forEach((elem) => elem.classList.add("chatAsideBreakpointProfile"));
        } else {
          elems.forEach((elem) => elem.classList.remove("chatAsideBreakpointProfile"));
        }
      };
      handleBreakpoint();

      window.addEventListener("resize", handleBreakpoint);
      return () => {
        window.removeEventListener("resize", handleBreakpoint);
        elems.forEach((elem) => elem.classList.remove("profileChatAsideBreakpoint"));
      }
    }, []);
  }

  // NOTE: A private profile page doesn't need to be seo friendly.
  useEffect(() => {
    getUserProfile().then((res) => {
      if (res.isSuccess && res.data?.user) {
        // Adds the extra user data needed for the profile.
        setUser({ ...storedUser, ...res.data.user as UserProfileCredentials });

        if (!storedUser.email_verified)
          dispatch(
            // TODO: Should this be in api? (no?)
            ADD_TOAST({
              title: "Verify your Profile",
              message: "We've noticed that your profile hasn't been verified yet, send verification email.",
              intent: "info",
              options: {
                button: {
                  sequence: "send verification email.",
                  onClick: () => handleSendVerifyEmail(dispatch)
                }
              }
            })
          );
      }
    })
  }, []);
  
  return (
    <Main
      className={s.profile}
      scrollable={viewport === "small" ? true : "horizontal"}
    >
      {profileLoading && <OverlayLoader message={content.loading} />}

      {user ? (
        <>
          <ScrollArea 
            orientation={viewport === "small" ? null : "vertical"}
            scrollbarSize="5"
          >
            {[Facing, Personal, Billing].map((SectionComp, i) => (
              <SectionComp
                key={i}
                localeEntry={{
                  ...content[SectionComp.name],
                  general: content.general
                }}
                numberFormat={numberFormat}
                user={user}
              />
            ))}
          </ScrollArea>

          <div>
            <Blob svgWidth={358.651} svgHeight={60.057} className={s.statsBlob}>
              <path
                d="M76.673.096c47.155.411 122.062-.367 185.446 0s84.235 18.009 94.6 31.316-22.983 14.985-53.137 21.914-67.2 4.076-67.2 4.076-45.687.988-104.892 0-71.592 9.135-104-4.717S-28.583-.816 76.673.096Z"
                fill="rgba(178,67,178,0.4)"
              />
            </Blob>
            <Blob svgWidth={345.54} svgHeight={81.424} className={s.activityBlob}>
              <path
                d="M73.87.137c45.431.557 117.6-.5 178.667 0s81.156 24.416 91.143 42.459-22.142 20.316-51.194 29.71-64.745 5.526-64.745 5.526-44.016 1.339-101.057 0-68.975 12.385-100.2-6.4S-27.538-1.104 73.87.137Z"
                fill="rgba(178,67,178,0.2)"
              />
            </Blob>

            <ScrollArea
              orientation={viewport === "small" ? null : "vertical"}
              scrollbarSize="5"
              className={s.inner}
            >
              {[Statistics, Activity].map((SectionComp, i) => (
                <SectionComp key={i} user={user} />
              ))}
            </ScrollArea>
          </div>
        </>
      ) : (
        <div className={s.profError}>
          <hgroup role="group" aria-roledescription="heading group">
            <h2>{content.error.title}</h2>
            <p aria-roledescription="subtitle">{content.error.para}</p>
          </hgroup>
          <Button
            intent="primary"
            size="xl"
            onClick={() => history.locationReload()}
          >
            {content.general.refresh}
          </Button>
        </div>
      )}
    </Main>
  );
}
