import type { VariantProps } from "class-variance-authority";
import type { UserCredentials, UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import { useEffect, useRef, useMemo, useState } from "react";
import { cva } from "class-variance-authority";

import { calcWinRate } from "@qc/utils";

import useLocale from "@hooks/useLocale";

import { Icon } from "@components/common";
import { Select } from "@components/common/controls";
import { ScrollArea } from "@components/scrollArea";
import { ModalTrigger } from "@components/modals";
import { ResentGame } from "@authFeat/components/userActivity";

import s from "./userStatistics.module.css";

const statistics = cva(s.stats, {
  variants: {
    intent: {
      table: s.table,
      block: s.block
    }
  }
});

interface UserRecord {
  wins: [string, number][];
  losses: [string, number][];
  gamesPlayed: UserCredentials["statistics"]["losses"]; // Uses the same object like wins and losses.
  conqueredQuests: string[];
}

export interface QuestsCompletedProps extends VariantProps<typeof statistics> {
  quests: UserRecord["conqueredQuests"];
  username: string;
}

export interface UserStatisticsProps extends React.ComponentProps<"div">,
  VariantProps<typeof statistics> {
  stats: UserCredentials["statistics"];
  username: string;
  gameHistory?: UserProfileCredentials["activity"]["game_history"];
  scaleText?: boolean;
}

function initializeRecord(stats: UserStatisticsProps["stats"]): UserRecord {
  const wins = Object.entries(stats.wins).filter(([key]) => key !== "streak" && key !== "rate"),
    losses = Object.entries(stats.losses);

  const gamesPlayed: any = {};
  for (const [title, num] of wins) gamesPlayed[title] = num;
  for (const [title, num] of losses) gamesPlayed[title] += num;

  const conqueredQuests: string[] = [];
  for (const [title, obj] of Object.entries(stats.progress.quest)) {
    if (obj.current >= obj.quest.cap) conqueredQuests.push(title);
  }

  return { wins, losses, gamesPlayed, conqueredQuests };
};

export default function UserStatistics({
  stats,
  username,
  gameHistory,
  className,
  intent,
  scaleText = false,
  ...props
}: UserStatisticsProps) {
  const questsContainerRef = useRef<HTMLDivElement>(null);

  const { type, getContent, content, numberFormat } = useLocale("UserStatistics"),
    formatter = useRef(numberFormat());

  const record = useMemo(() => initializeRecord(stats), [stats]),
    [category, setCategory] = useState({ index: 0, winRate: stats.wins.rate });

  useEffect(() => {
    let retries = 2
    const interval = setInterval(() => {
      const scrollbar = questsContainerRef.current!.querySelector<HTMLDivElement>(".scrollbar");
      if (scrollbar) {
        questsContainerRef.current!.style.setProperty("--_horz-scrollbar-height", "19px");
        clearInterval(interval);
      } else if (retries === 0) {
        clearInterval(interval);
      }
      retries--;
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={statistics({ className, intent })} data-scale-text={scaleText} {...props}>
      <hgroup>
        <Icon
          aria-hidden="true"
          id={scaleText ? "bar-chart-38" : "bar-chart-28"}
          scaleWithText
        />
        <h2 id="hStatistics" {...(!scaleText && { className: "hUnderline" })}>
          {content.title}
        </h2>
      </hgroup>
      
      {intent === "table" && (
        <>
          <div className={s.winLoss}>
            <header>
              <h3 id="hWinLoss" className="hUnderline">
                {content.section.winLoss.title}
              </h3>
              <Select
                aria-controls="winLossTable"
                label={content.section.winLoss.changeCat}
                intent="ghost"
                id="WinLossSelect"
                defaultValue="total"
                onInput={(e) => {
                  const target = e.currentTarget,
                    index = target.selectedIndex - 1;

                  setCategory({
                    index,
                    winRate:
                      target.value === "total"
                        ? stats.wins.rate
                        : calcWinRate(
                            record.wins[index][1],
                            record.losses[index][1]
                          )
                  });
                }}
              >
                {record.wins.map(([title]) => (
                  <option key={title} value={title}>{content[title]}</option>
                ))}
              </Select>
            </header>
            <div
              role="table"
              aria-labelledby="hWinLoss"
              aria-describedby="cWinLoss"
              aria-live="polite"
              id="winLossTable"
            >
              <div
                role="caption"
                id="cWinLoss"
                style={{ position: "absolute", opacity: 0, zIndex: -1 }}
              >
                {content.section.winLoss.caption}
              </div>
              <div role="rowgroup">
                <div
                  role="row"
                  title={
                    formatter.current.format(record.wins[category.index][1]) + " " + content.wins
                  }
                >
                  <span role="rowheader">{content.wins}</span>
                  <span role="cell">
                    {formatter.current.format(record.wins[category.index][1])}
                  </span>
                </div>
                <div
                  role="row"
                  title={
                    formatter.current.format(record.losses[category.index][1]) + " " + content.losses
                  }
                >
                  <span role="rowheader">{content.losses}</span>
                  <span role="cell">
                    {formatter.current.format(record.losses[category.index][1])}
                  </span>
                </div>
                <div
                  role="row"
                  title={
                    numberFormat({ style: "percent" }).format(category.winRate / 100) + " " + content.rate
                  }
                >
                  <span role="rowheader">{content.rate}</span>
                  <span role="cell">
                    {numberFormat({ style: "percent" }).format(category.winRate / 100)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.gamesPlayed}>
            <h3 id="hGamesPlayed" className="hUnderline">
              {content.section.gamesPlayed.title}
            </h3>
            <div
              role="table"
              aria-labelledby="hGamesPlayed"
              aria-describedby="cGamesPlayed"
            >
              <div
                role="caption"
                id="cGamesPlayed"
                style={{ position: "absolute", opacity: 0, zIndex: -1 }}
              >
                {username
                  ? content.section.gamesPlayed.caption.replace("Your", username)
                  : content.section.gamesPlayed.caption}
              </div>
              <div role="rowgroup">
                <div
                  role="row"
                  title={
                    `${formatter.current.format(record.gamesPlayed.table)} ${content.table} ${content.general.games} ${content.played}`
                  }
                >
                  <span role="rowheader">{content.table}</span>
                  <span role="cell">
                    {formatter.current.format(record.gamesPlayed.table)}
                  </span>
                </div>
                <div
                  role="row"
                  title={
                    `${formatter.current.format(record.gamesPlayed.slots)} ${content.slots} ${content.general.games} ${content.played}`
                  }
                >
                  <span role="rowheader">{content.slots}</span>
                  <span role="cell">
                    {formatter.current.format(record.gamesPlayed.slots)}
                  </span>
                </div>
                <div
                  role="row"
                  title={
                    `${formatter.current.format(record.gamesPlayed.dice)} ${content.dice} ${content.general.games} ${content.played}`
                  }
                >
                  <span role="rowheader">{content.dice}</span>
                  <span role="cell">
                    {formatter.current.format(record.gamesPlayed.dice)}
                  </span>
                </div>
                <div
                  role="row"
                  title={
                    `${formatter.current.format(record.gamesPlayed.total)} ${content.total} ${content.general.games} ${content.played}`
                  }
                >
                  <span role="rowheader">{content.total}</span>
                  <span role="cell">
                    {formatter.current.format(record.gamesPlayed.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div ref={questsContainerRef} className={s.quests}>
        {intent === "table" && (
          <>
            <h3 aria-label={content.section.quests.aria.label.summary} className="hUnderline">
              {content.section.quests.title}
            </h3>
            <ScrollArea orientation="horizontal">
              {record.conqueredQuests.length > 0 && (
                <ul
                  aria-label={`${content.section.quests.completed} ${content.section.quests.title}`}
                  aria-describedby="questCount"
                >
                  {record.conqueredQuests.map((quest) => (
                    <li key={quest} title={quest}>
                      {quest}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </>
        )}

        {intent === "block" &&
          <>
            <div className={s.wins}>
              <h4>{content.total} {content.wins}</h4>
              <p>{formatter.current.format(record.wins[0][1])}</p>
            </div>

            <div className={s.losses}>
              <h4>{content.total} {content.losses}</h4>
              <p>{formatter.current.format(record.losses[0][1])}</p>
            </div>

            <div className={s.played}>
              <h4>{content.total} {content.general.games}</h4>
              <p>{formatter.current.format(record.gamesPlayed.total)}</p>
            </div>

            <div className={s.rate}>
              <h4>{content.rate}</h4>
              <p>{numberFormat({ style: "percent" }).format(category.winRate / 100)}</p>
            </div>
          </>
        }
        <div className={s.conquered}>
          <p id="questCount">
            <span>
              {formatter.current.format(record.conqueredQuests.length)}
            </span>{" "}
            {type === "en" && record.conqueredQuests.length === 1
              ? content.section.quests.title.replace("s", "")
              : content.section.quests.title}{" "}
            {content.section.quests.completed}
          </p>
          {record.conqueredQuests.length > 0 && (
            <ModalTrigger
              aria-label={content.section.quests.aria.label.viewBtn.replace(
                "{{username}}",
                type === "en" ? username + "'s" : username
              )}
              intent="primary"
              query={{ param: "qhist", value: encodeURIComponent(username) }}
              className={s.viewBtn}
            >
              {content.section.quests.viewBtn}
            </ModalTrigger>
          )}
        </div>
        {intent === "block" && gameHistory && (
          <ResentGame
            localeEntry={getContent("UserGameHistory")}
            gameHistory={gameHistory}
          />
        )}
      </div>
    </div>
  );
}
