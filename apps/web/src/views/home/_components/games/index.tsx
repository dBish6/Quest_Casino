import type { Game } from "@qc/typescript/dtos/GetGamesDto";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { LocaleContent } from "@typings/Locale";

import { ScrollArea } from "@components/scrollArea";
import GamesDev from "./GamesDev";
import GamesActive from "./GamesActive";

import s from "../../home.module.css";

interface GamesActiveProps {
  localeContent: LocaleContent;
  status: "active" | "development";
  games: Game[];
  gamesLoading: boolean;
  user?: UserCredentials | null;
}

export function Games({ localeContent, status, games, gamesLoading, user }: GamesActiveProps) {
  const isActive = status === "active";

  return (
    <ScrollArea
      {...(isActive ? { id: "gamesArea", orientation: "vertical" } : { orientation: "horizontal" })}
    >
      <>
        {(() => {
          const gamesToRender: (Game | undefined)[] = gamesLoading
            ? Array.from({ length: status === "active" ? 10 : 3 }) : games;

            return gamesToRender?.length ? (
              <ul
                {...(isActive ? { id: "activeGames" } : { className: s.gamesSoon })}
              >
                {isActive ? (
                  <GamesActive
                    localeEntry={localeContent.section.games}
                    games={gamesToRender}
                    user={user!}
                  />
                ) : (
                  <GamesDev games={gamesToRender} />
                )}
              </ul>
            ) : (
              <p>{localeContent.general.noResults}</p>
            );
        })()}
      </>
    </ScrollArea>
  )
}

export { GamesFilters, GamesSearch } from "./GamesActive";
