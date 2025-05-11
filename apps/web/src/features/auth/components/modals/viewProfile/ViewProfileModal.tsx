import type { ViewUserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import { useSearchParams } from "react-router-dom";
import { useState } from "react";

import injectElementInText from "@utils/injectElementInText";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import useLocale from "@hooks/useLocale";
import useLeaderboard from "@hooks/useLeaderboard";
import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";

import { useAppSelector } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";

import { useLazyGetUserProfileQuery } from "@authFeat/services/authApi";

import { ModalQueryKey, ModalTemplate } from "@components/modals";
import { Link } from "@components/common";
import { Spinner } from "@components/loaders";
import { UserGeneral } from "@authFeat/components/userGeneral";
import { UserStatistics } from "@authFeat/components/userStatistics";
import { UserGameHistory } from "@authFeat/components/userActivity";
import { ScrollArea } from "@components/scrollArea";

import s from "./viewProfileModal.module.css";

export default function ViewProfileModal() {
  const [searchParams] = useSearchParams(),
    username = searchParams.get(ModalQueryKey.VIEW_PROFILE_MODAL) || "";

  const { content } = useLocale("ViewProfileModal");

  const { selectedUser } = useLeaderboard(),
    storedUser = useAppSelector(selectUserCredentials)! || {};

  const [getUserProfile, { isFetching: profileLoading, error: profileError }] = useLazyGetUserProfileQuery(),
    [user, setUser] = useState<ViewUserProfileCredentials | null>(null);

  useResourcesLoadedEffect(() => {
    // A user selected from the leaderboard can have the same credentials needed.
    if (selectedUser) {
      setUser(selectedUser);
    } else if (username) {
      let query;

      if (storedUser.username === username) {
        // Attempts to use the cached result from fetching the user's private profile.
        query = getUserProfile(undefined, true);
        query.then((res: any) => {
          if (res.isSuccess && res.data?.user)
            setUser({ ...storedUser, ...res.data.user as ViewUserProfileCredentials });
        });
      } else {
        query = getUserProfile({ username: decodeURIComponent(username) });
        query.then((res: any) => {
          if (res.isSuccess && res.data?.user)
            setUser(res.data?.user as ViewUserProfileCredentials);
        });
      }
      return () => query?.abort();
    }
  }, [username]);

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey="prof"
      width="778px"
      className={s.modal}
      onCloseAutoFocus={() => setUser(null)}
    >
      {() =>
        profileLoading ? (
          <Spinner intent="primary" size="xxl" />
        ) : !user ? (
          <p role="alert">
            {isFetchBaseQueryError(profileError) ? (
              // TODO: SERVER MESSAGE.
              profileError.data?.ERROR.endsWith("in our system.") ? (
                profileError.data.ERROR
              ) : (
                <>
                  {injectElementInText(
                    content.error.unexpected,
                    null,
                    (text) => (
                      <Link intent="primary" to="/support">
                        {text}
                      </Link>
                    ),
                    { localeMarker: true }
                  )}
                </>
              )
            ) : (
              <>
                {injectElementInText(
                  content.error.unknown,
                  null,
                  (text) => (
                    <Link intent="primary" to="/support">
                      {text}
                    </Link>
                  ),
                  { localeMarker: true }
                )}
              </>
            )}
          </p>
        ) : (
          <div role="group">
            <section
              aria-label={content.section.general.aria.label.section}
              className={s.info}
            >
              <UserGeneral size="full" user={user} />
            </section>

            <section aria-labelledby="hStatistics" className={s.statistics}>
              <UserStatistics
                intent="table"
                stats={user.statistics}
                username={user.username}
              />
            </section>

            <section aria-labelledby="hUsrHistory" className={s.activity}>
              <ScrollArea orientation="vertical">
                <UserGameHistory
                  gameHistory={user.activity.game_history}
                  username={user.username}
                />
              </ScrollArea>
            </section>
          </div>
        )
      }
    </ModalTemplate>
  );
}

ViewProfileModal.restricted = "loggedOut";
