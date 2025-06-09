import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";
import type { LocaleEntry } from "@typings/Locale";

import { useState } from "react";

import useLocale from "@hooks/useLocale";

import { Icon } from "@components/common";
import { Button } from "@components/common/controls";

import s from "./userGameHistory.module.css";

export interface UserGameHistoryProps extends React.ComponentProps<"div"> {
  gameHistory: UserProfileCredentials["activity"]["game_history"];
  username?: string;
}

export default function UserGameHistory({ gameHistory, username, ...props }: UserGameHistoryProps) {
  const [order, setOrder] = useState<{
    timestamp?: boolean;
    result?: boolean;
    history: typeof gameHistory;
  }>({ timestamp: true, history: gameHistory });

  const { content, numberFormat, dateTimeFormat } = useLocale("UserGameHistory");

  const handleSort = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const target = e.currentTarget,
      type = target.previousSibling!.textContent === content.result ? "result" : "timestamp",
      isDescending = target.getAttribute("aria-pressed") === "true";

    let sortHistory;
    if (type === "timestamp") {
      sortHistory = isDescending ? gameHistory.slice().reverse() : gameHistory;
    } else {
      const order = isDescending ? ["loss", "draw", "win"] : ["win", "draw", "loss"];
      sortHistory = gameHistory.slice();
      sortHistory.sort((a, b) =>
        order.indexOf(a.result.outcome) - order.indexOf(b.result.outcome)
      );
    }

    target.setAttribute(
      "aria-label",
      isDescending ? content.aria.label[type][1] : content.aria.label[type][0]
    );
    setOrder({ [type]: !isDescending, history: sortHistory });
  };

  return (
    <div role="presentation" className={s.history} {...props}>
      <hgroup data-scale-text={!!username}>
        <Icon
          aria-hidden="true"
          id={username ? "notepad-24" : "notepad-32"}
          scaleWithText
        />
        <h2 id="hUsrHistory" {...(username && { className: "hUnderline" })}>
          {content.title}
        </h2>
      </hgroup>

      {order.history.length ? (
        <div
          role="table"
          aria-labelledby="hUsrHistory"
          aria-describedby="cUsrHistory"
          aria-live="polite"
          className={s.history}
        >
          <div role="caption" id="cUsrHistory" style={{ position: "absolute", opacity: 0 }}>
            {content.caption}
          </div>
          <div role="rowgroup">
            <div role="row">
              <div role="columnheader">{content.game}</div>
              <div role="columnheader" aria-label={content.result}>
                <span>{content.result}</span>
                <Button
                  aria-label={content.aria.label.result[1]}
                  aria-controls="histRowGroup"
                  aria-pressed={order.result}
                  intent="ghost"
                  size="xsm"
                  type="submit"
                  iconBtn
                  onClick={handleSort}
                >
                  <Icon aria-hidden="true" id="expand-10" />
                </Button>
              </div>
              <div role="columnheader" aria-label={content.timestamp}>
                <span>{content.timestamp}</span>
                <Button
                  aria-label={content.aria.label.timestamp[0]}
                  aria-controls="histRowGroup"
                  aria-pressed={order.timestamp}
                  intent="ghost"
                  size="xsm"
                  type="submit"
                  iconBtn
                  onClick={handleSort}
                >
                  <Icon aria-hidden="true" id="expand-10" />
                </Button>
              </div>
            </div>
          </div>
          <div role="rowgroup" id="histRowGroup">
            {order.history.map((game) => (
              <div key={game.timestamp} role="row">
                <div role="cell" title={game.game_name}>{game.game_name}</div>
                <div role="cell" data-outcome={game.result.outcome}>
                <span>{content[game.result.outcome]}</span>
                  {numberFormat({
                    signDisplay: "always",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(
                    Number(
                      `${["win", "draw"].includes(game.result.outcome) ? "+" : "-"}${game.result.earnings}`
                    )
                  )}
                </div>
                <div
                  role="cell"
                  title={dateTimeFormat({
                    dateStyle: "medium",
                    timeStyle: "short",
                    hour12: false
                  }).format(new Date(game.timestamp))}
                >
                  {dateTimeFormat({
                    dateStyle: "medium",
                    timeStyle: "short",
                    hour12: false
                  }).format(new Date(game.timestamp))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>{content.general.noResults}</p>
      )}
    </div>
  );
}

export function ResentGame({ localeEntry, gameHistory }: { localeEntry: LocaleEntry; gameHistory: UserGameHistoryProps["gameHistory"] }) {
  return (
    <div className={s.resentGame}>
      <h4>{localeEntry.resentGame}</h4>
      <p>
        {gameHistory.length > 0 ? (
          <>
            {gameHistory[0].game_name}{" "}
            <span data-outcome={gameHistory[0].result.outcome}>
              {localeEntry[gameHistory[0].result.outcome]}
            </span>
          </>
        ) : (
          localeEntry.noGame
        )}
      </p>
    </div>
  );
}
