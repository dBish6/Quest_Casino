import type { LeaderboardContextValues } from "./LeaderboardProvider";
import type { LocaleEntry } from "@typings/Locale";
import type { LocaleContextValues } from "@components/LocaleProvider";
import type { ViewUserProfileCredentials } from "@qc/typescript/typings/UserCredentials";
import type { LeaderboardType } from "@qc/constants";

import { useSearchParams } from "react-router-dom";
import { useState } from "react";

import useLeaderboard from "@hooks/useLeaderboard";
import useResourcesLoadedEffect from "@hooks/useResourcesLoadedEffect";

import { useLazyGetLeaderboardQuery } from "@gameFeat/services/gameApi";

import { ModalQueryKey } from "@components/modals";
import { ScrollArea } from "@components/scrollArea";
import { Select } from "@components/common/controls";
import { Avatar } from "@components/common";
import { Spinner } from "@components/loaders";
import { UserGeneral } from "@authFeat/components/userGeneral";
import { UserStatistics } from "@authFeat/components/userStatistics";

import s from "./leaderboard.module.css";

interface TopUserProps extends LeaderboardContextValues {
  localeSection: LocaleEntry;
  numberFormat: LocaleContextValues["numberFormat"];
  type: LeaderboardType;
  user: ViewUserProfileCredentials;
  rank: number;
}

interface LeaderboardProps {
  localeEntry: LocaleEntry
  numberFormat: LocaleContextValues["numberFormat"];
}

export default function Leaderboard({ localeEntry, numberFormat }: LeaderboardProps) {
  const [searchParams] = useSearchParams(),
    slide = searchParams.get(ModalQueryKey.MENU_MODAL) === "Leaderboard";

  const { selectedUser, setSelectedUser } = useLeaderboard();

  const [getLeaderboard, { isFetching: leaderboardLoading }] = useLazyGetLeaderboardQuery(),
    [topUsers, setTopUsers] = useState<{
      type: LeaderboardType;
      users: ViewUserProfileCredentials[] | null;
    }>({ type: "rate", users: null });

  useResourcesLoadedEffect(() => {
    if (slide) {
      const query = getLeaderboard({ type: topUsers.type }, true);
      query.then((res) => {
        if (res.isSuccess && res.data?.users)
          setTopUsers((prev) => ({ ...prev, users: res.data.users }));
      });

      return () => query.abort();
    }
  }, [slide, topUsers.type]);

  return (
    <div
      role="group"
      aria-label={localeEntry.title}
      aria-roledescription="slide"
      id="lSlide"
      className={`slideContent ${s.leaderboard}`}
    >
      <section
        aria-label={localeEntry.section.topUsers.aria.label.section}
        className={s.board}
      >
        <div className={s.filter}>
          <Select
            aria-controls="topUsers"
            label={localeEntry.section.topUsers.aria.label.changeCat}
            hideLabel
            intent="primary"
            size="lrg"
            id="leaderboardSelect"
            defaultValue="rate"
            disabled={!topUsers}
            onInput={(e) => {
              const target = e.currentTarget;
              setTopUsers((prev) => ({
                ...prev,
                type: target.options[target.selectedIndex].value as LeaderboardType
              }));
            }}
          >
            <option value="rate">
              {localeEntry.section.topUsers.categories[0]}
            </option>
            <option value="total">
              {localeEntry.section.topUsers.categories[1]}
            </option>
          </Select>
        </div>
        <ScrollArea orientation="vertical" type="scroll" className={s.topUsers}>
          {leaderboardLoading ? (
            <Spinner intent="primary" size="xl" />
          ) : topUsers.users?.length ? (
            <ul
              aria-label={localeEntry.section.topUsers.aria.label.leaders}
              id="topUsers"
            >
              {topUsers.users.map((user, i) => (
                <TopUser
                  key={user.member_id}
                  localeSection={localeEntry.section.topUsers}
                  numberFormat={numberFormat}
                  type={topUsers.type}
                  user={user}
                  rank={i + 1}
                  selectedUser={selectedUser}
                  setSelectedUser={setSelectedUser}
                />
              ))}
            </ul>
          ) : (
            <p>{localeEntry.section.topUsers.noResults}</p>
          )}
        </ScrollArea>
      </section>

      <section aria-label={localeEntry.section.selectedUser.aria.label.section} className={s.selected}>
        {!selectedUser ? (
          <p>{localeEntry.section.selectedUser.select}</p>
        ) : (
          <ScrollArea orientation="vertical">
            <UserGeneral size="compact" user={selectedUser} />

            <UserStatistics
              intent="block"
              stats={selectedUser.statistics}
              username={selectedUser.username}
              gameHistory={selectedUser.activity.game_history}
            />
          </ScrollArea>
        )}
      </section>
    </div>
  );
}

function TopUser({
  localeSection,
  numberFormat,
  type,
  user,
  rank,
  selectedUser,
  setSelectedUser
}: TopUserProps) {
  const localeRank = numberFormat().format(rank),
    localeWinStat = numberFormat({
      ...(type === "rate" && { style: "percent" })
    }).format(
      type === "rate" ? user.statistics.wins[type] / 100 : user.statistics.wins[type]
    );

  return (
    <li className={s.topUser}>
      <button
        aria-label={localeSection.aria.label.topUser
          .replace("{{rank}}", localeRank + ".")
          .replace("{{username}}", user.username)
          .replace("{{stat}}", localeWinStat)
          .replace("{{type}}", type === "rate" ? localeSection.categories[0] : localeSection.categories[1])}
        aria-pressed={selectedUser?.member_id === user.member_id}
        onClick={() => setSelectedUser(user)}
      >
        <span data-rank={rank}>{localeRank + "."}</span>
        <div className={s.content}>
          <Avatar size="md" user={user} showShortView={false} linkProfile={false} />
          <hgroup role="group" aria-roledescription="heading group">
            <h2 title={user.username}>{user.username}</h2>
            <p
              title={`${user.legal_name.first} ${user.legal_name.last}`}
              aria-roledescription="subtitle"
            >
              {user.legal_name.first} {user.legal_name.last}
            </p>
          </hgroup>
        </div>

        <div className={s.wins}>
          <p {...(type === "rate" && { "aria-label": localeSection.categories[0] })}>
            {localeSection[type]}
          </p>
          <p>{localeWinStat}</p>
        </div>
      </button>
    </li>
  );
}
