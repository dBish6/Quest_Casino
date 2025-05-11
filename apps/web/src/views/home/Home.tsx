import type { CarouselContentResponseDto } from "./_components/Carousel";
import type { Game } from "@qc/typescript/dtos/GetGamesDto";

import { useLoaderData } from "react-router-dom";
import { useState, useEffect } from "react";

import useLocale from "@hooks/useLocale";
import useBreakpoint from "@hooks/useBreakpoint";
import useStableSearchParams from "@hooks/useStableSearchParams";
import useUser from "@authFeat/hooks/useUser";

import { useLazyGetGamesQuery } from "@gameFeat/services/gameApi";

import { Main } from "@components/dashboard";
import { Icon } from "@components/common";
import Carousel from "./_components/Carousel";
import { Games, GamesFilters, GamesSearch } from "./_components/games";

import s from "./home.module.css";

export interface GameDataState {
  development: Game[];
  active: {
    initial: Game[];
    current: Game[];
    searched: Game[];
  };
}

export default function Home() {
  const carouselContent = useLoaderData() as CarouselContentResponseDto,
    [searchParams, setStableSearchParams] = useStableSearchParams();
  
  const { content } = useLocale(),
    { welCarousel, title, viewport } = useBreakpoint();

  const user = useUser();

  const [getGames, { isFetching: gamesLoading }] = useLazyGetGamesQuery(),
    [gameData, setGameData] = useState<GameDataState>({
      development: [],
      active: { initial: [], current: [], searched: [] }
    });

  useEffect(() => {
    const query = getGames();
    query.then((res) => {
      if (res.data?.games) {
        const cat = { development: [], active: [] } as any;
        for (const game of res.data.games) 
          if (["development", "active"].includes(game.status)) cat[game.status].push(game);
        
        setGameData((prev) => ({
          development: cat.development,
          active: { ...prev.active, initial: cat.active }
        }));
      }
    });

    return () => query.abort();
  }, []);

  /**
   * Sets the height of the active games viewport to prevent the page from annoyingly scrolling 
   * up when switching to a filter with fewer games.
   */
  useEffect(() => {
    requestAnimationFrame(() => {
      const initialLength = gameData.active.initial.length;
      if (initialLength && initialLength === gameData.active.current.length) {
        const viewport = document.getElementById("gamesArea")!.children.item(1)! as HTMLDivElement;
        viewport.style.height = `${viewport.clientHeight}px`;
      }
    });
  }, [gameData.active.current]);

  return (
    <Main className={s.home}>
      <section
        aria-label={content.section.Carousel.aria.label.section}
        className={s.hero}
      >
        <Carousel
          localeEntry={{ ...content.section.Carousel, general: content.general }}
          {...(!(carouselContent as any)?.ERROR && { content: carouselContent })}
          breakpoint={welCarousel}
        />
      </section>

      <section aria-labelledby="hSoon" className={s.comingSoon} aria-busy={gamesLoading}>
        <hgroup>
          <Icon aria-hidden="true" id="alarm-clock-32" scaleWithText />
          <h2 id="hSoon">{content.section.soon.title}</h2>
        </hgroup>

        <Games
          localeContent={content}
          status="development"
          games={gameData.development}
          gamesLoading={gamesLoading}
        />
      </section>

      <section
        aria-labelledby="hGames"
        id="games"
        className={s.games}
        aria-busy={gamesLoading}
        aria-live="polite"
      >
        {title.games && (
          <hgroup>
            <Icon aria-hidden="true" id="joystick-32" scaleWithText />
            <h2 id="hGames">{content.general.games}</h2>
          </hgroup>
        )}
        <div className={s.content}>
          <header>
            {!title.games && (
              <hgroup>
                <Icon aria-hidden="true" id="joystick-32" scaleWithText />
                <h2 id="hGames">{content.general.games}</h2>
              </hgroup>
            )}

            {viewport !== "small" && (
              <GamesFilters
                localeEntry={content.section.games}
                gameData={gameData.active}
                setGameData={setGameData}
                searchParams={searchParams}
                setStableSearchParams={setStableSearchParams}
                user={user}
              />
            )}
            <GamesSearch
              localeEntry={content.section.games}
              gameData={gameData.active}
              setGameData={setGameData}
              searchParams={searchParams}
              setStableSearchParams={setStableSearchParams}
              user={user}
              viewport={viewport}
            />
          </header>

          <Games
            localeContent={content}
            status="active"
            games={gameData.active.current}
            gamesLoading={gamesLoading}
            user={user}
          />
        </div>
      </section>
    </Main>
  );
}
