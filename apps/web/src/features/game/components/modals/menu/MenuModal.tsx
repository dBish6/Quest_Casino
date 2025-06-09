import type { SetURLSearchParams } from "react-router-dom";
import type Direction from "@typings/Direction";
import type { IconIds } from "@components/common";
import type { LocaleContent } from "@typings/Locale";

import { useSearchParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { Title } from "@radix-ui/react-dialog";

import injectElementInText from "@utils/injectElementInText";

import useLocale from "@hooks/useLocale";
import useLeaderboard from "@hooks/useLeaderboard";

import { ModalQueryKey, ModalTemplate } from "@components/modals";
import { Icon } from "@components/common";
import { Button } from "@components/common/controls";
import { HoverCard } from "@components/hoverCard";
import { ScrollArea } from "@components/scrollArea";
import { Leaderboard, Quests, Bonuses } from "./slides";

import s from "./menuModal.module.css";

export type MenuSlide = "Leaderboard" | "Quests" | "Bonuses";

const SLIDE_MAP = {
  Leaderboard: { icon: "list", Comp: Leaderboard },
  Quests: { icon: "scroll", Comp: Quests },
  Bonuses: { icon: "gift", Comp: Bonuses }
} as const;

function handleTransition(setSearchParams: SetURLSearchParams, direction?: Direction) {
  setSearchParams((params) => {
    let slide = params.get(ModalQueryKey.MENU_MODAL)!;
    if (slide === (direction === "left" ? "Leaderboard" : "Quests")) {
      slide = "Bonuses";
    } else if (slide === (direction === "left" ? "Bonuses" : "Leaderboard")) {
      slide = "Quests";
    } else {
      slide = "Leaderboard";
    }
    params.set(ModalQueryKey.MENU_MODAL, slide);
    return params;
  });
}

export default function MenuModal() {
  const [searchParams, setSearchParams] = useSearchParams(),
    currentSlide = searchParams.get(ModalQueryKey.MENU_MODAL)! as MenuSlide;

  const { content, numberFormat } = useLocale("MenuModal");

  const renewRef = useRef<HTMLTimeElement>(null),
    [renewsIn, setRenewsIn] = useState("00:00:00");

  const { setSelectedUser } = useLeaderboard();

  const SlideComponent = SLIDE_MAP[currentSlide]?.Comp || null;

  useEffect(() => {
    if (renewsIn !== "00:00:00") {
      const targetTime = new Date(renewsIn).getTime(),
        formatUnit = (n: number) => numberFormat().format(n).padStart(2, "0");

      const updateCountdown = () => {
        if (!renewRef.current) return;

        const timeLeft = Math.max(0, targetTime - Date.now());

        const hours = Math.floor(timeLeft / (1000 * 60 * 60)),
          minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)),
          seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        const formattedTime = `${formatUnit(hours)}:${formatUnit(minutes)}:${formatUnit(seconds)}`;

        renewRef.current.innerHTML = formattedTime;
        renewRef.current.dateTime = formattedTime;

        if (timeLeft <= 0) clearInterval(timerInterval);
      };

      updateCountdown();
      const timerInterval = setInterval(updateCountdown, 1000);

      return () => clearInterval(timerInterval);
    }
  }, [renewsIn]);

  useEffect(() => {
    setRenewsIn("00:00:00");
  }, [currentSlide]);
  
  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey="menu"
      width="768px"
      className={s.modal}
      onCloseAutoFocus={() => setSelectedUser(null)} // Resets the selected leaderboard user on close.
    >
      {() => (
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label={content.aria.label.menu}
          aria-live="polite"
        >
          <div className="head" data-slide={currentSlide}>
            <hgroup>
              <Icon
                aria-hidden="true"
                id={((SLIDE_MAP[currentSlide]?.icon || "list") + "-48") as IconIds}
              />
              <Title asChild>
                <h2>{content[currentSlide]?.title}</h2>
              </Title>
            </hgroup>
            <div className={s.controls}>
              {currentSlide && currentSlide !== "Leaderboard" && (
                <InfoCard localeContent={content} currentSlide={currentSlide} />
              )}
              <div>
                <Button
                  aria-controls="lSlide"
                  intent="primary"
                  size="lrg"
                  iconBtn
                  onClick={() => handleTransition(setSearchParams, "left")}
                >
                  <Icon aria-label={content.aria.label.left} id="expand-22" />
                </Button>
                <Button
                  aria-controls="lSlide"
                  intent="primary"
                  size="lrg"
                  iconBtn
                  onClick={() => handleTransition(setSearchParams, "right")}
                >
                  <Icon aria-label={content.aria.label.right} id="expand-22" />
                </Button>
              </div>
            </div>
          </div>
  
          {/* Slide */}
          {SlideComponent ? (
            <SlideComponent
              localeEntry={content[currentSlide]}
              numberFormat={numberFormat}
              setRenewsIn={setRenewsIn}
            />
          ) : (
            <p>{content.notFound}</p>
          )}

          <div>
            {currentSlide !== "Leaderboard" && (
              <div className={s.timer}>
                <span id="renew">{content.renewsIn}</span>{" "}
                <time ref={renewRef} dateTime={renewsIn}>{renewsIn}</time>
              </div>
            )}

            <div
              role="group"
              aria-label={content.general.indicators}
              className={s.indicators}
            >
              {Object.entries(SLIDE_MAP).map(([slide, obj]) => {
                const currSlide = slide === currentSlide;

                return (
                  <Button
                    key={slide}
                    size="sm"
                    iconBtn
                    aria-pressed={currSlide}
                    disabled={currSlide}
                    onClick={() =>
                      setSearchParams((params) => {
                        params.set(ModalQueryKey.MENU_MODAL, slide);
                        return params;
                      })
                    }
                  >
                    <Icon
                      aria-label={`${content[slide.toLowerCase()]} ${content.general.indicator[0]}${
                        currSlide ? content.general.indicator[1] : ""
                      }`}
                      id={((obj.icon || "list") + "-20") as IconIds}
                    />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ModalTemplate>
  );
}

function InfoCard({ localeContent, currentSlide }: { localeContent: LocaleContent; currentSlide: MenuSlide }) {
  const [keepInfoOpen, setSeepInfoOpen] = useState(false);

  return (
    <HoverCard
      id="slideInfo"
      className={s.infoCard}
      Trigger={
        <Button
          aria-controls="slideInfo"
          aria-expanded={keepInfoOpen ? "true" : "false"}
          aria-pressed={keepInfoOpen}
          intent="secondary"
          size="lrg"
          className={s.info}
          onClick={() => setSeepInfoOpen(!keepInfoOpen)}
        >
          <Icon aria-hidden="true" id="info-21" /> {localeContent.infoBtn}
        </Button>
      }
      open={keepInfoOpen}
      openDelay={keepInfoOpen ? 0 : 500}
    >
      {({ Arrow }) => (
        <>
          <Arrow />
          <h3>{localeContent.info.replace("{{slide}}", localeContent[currentSlide].title)}</h3>
          <p>{localeContent.renew.replaceAll("{{type}}", localeContent[currentSlide].title)}</p>
          <ScrollArea orientation="vertical">
            <ul id="stepsList" aria-label="Steps">
              {localeContent[currentSlide].info.map(
                (step: string | string[], i: number) => (
                  <li key={i}>
                    {(() => {
                      const element = (text: any): React.ReactNode => <strong>{text}</strong>;

                      if (Array.isArray(step)) {
                        return (
                          <>
                            {injectElementInText(step[0], null, element, {
                              localeMarker: true,
                              injectAll: true
                            })}
                            {
                              <ul aria-label={localeContent.Bonuses.aria.label.innerList}>
                                {(step[1] as any).map((innerStep: string, i: number) => (
                                  <li key={i}>
                                    {injectElementInText(innerStep, null, element, {
                                        localeMarker: true,
                                        injectAll: true
                                      })}
                                  </li>
                                ))}
                              </ul>
                            }
                          </>
                        );
                      }

                      return injectElementInText(step, null, element, {
                        localeMarker: true,
                        injectAll: true
                      });
                    })()}
                  </li>
                )
              )}
            </ul>
          </ScrollArea>
        </>
      )}
    </HoverCard>
  )
}

MenuModal.restricted = "loggedOut";
