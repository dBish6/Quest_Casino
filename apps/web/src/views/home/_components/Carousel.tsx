import type { SetURLSearchParams } from "react-router-dom";
import type { LocaleEntry } from "@typings/Locale";
import type Direction from "@typings/Direction";
import type { MinUserCredentials } from "@qc/typescript/typings/UserCredentials";

import { useSearchParams } from "react-router-dom";
import { useRef, useState, useEffect, Fragment } from "react";
import { AnimatePresence, m } from "framer-motion";
import { throttle } from "tiny-throttle";

import injectElementInText from "@utils/injectElementInText";

import useUser from "@authFeat/hooks/useUser";
import { useAppDispatch } from "@redux/hooks";
import { useLazyGetUsersQuery } from "@authFeat/services/authApi";

import { Button } from "@components/common/controls";
import { Icon, Image, Link, Avatar } from "@components/common";
import { ScrollArea } from "@components/scrollArea";
import { SkeletonAvatar, SkeletonText, SkeletonTitle } from "@components/loaders";
import { ModalTrigger } from "@components/modals";

import s from "../home.module.css";
import handleSendVerifyEmail from "@authFeat/services/handleSendVerifyEmail";

interface SlideEntryDto {
  title: string;
  description: string;
  image?: { src: string; alt: string };
  sequence: {
    title_emp: string | null;
    link: { sequence: string; to: string } | null;
  };
}

export interface CarouselContentResponseDto {
  news: NonNullable<SlideEntryDto>;
  events: {
    entries: Omit<SlideEntryDto, "image">[];
    image: { src: string; alt: string };
  };
}

type HeroCarouselSlides = (typeof HERO_SLIDES)[number];

interface IndicatorsProps {
  localeEntry: LocaleEntry;
  heroSlides: typeof HERO_SLIDES;
  currentSlide: HeroCarouselSlides;
  setSearchParams: SetURLSearchParams;
  interaction: boolean;
}

interface PlayersSlideProps {
  localeEntry: LocaleEntry;
  usersDataRef: React.MutableRefObject<MinUserCredentials[]>;
  breakpoint: boolean;
}

interface CarouselProps {
  localeEntry: LocaleEntry;
  content?: CarouselContentResponseDto;
  breakpoint: boolean;
}

const HERO_SLIDES = ["News", "Events", "Players"] as const;

function handleTransition(setCurrentSlide: React.Dispatch<React.SetStateAction<HeroCarouselSlides>>, direction?: Direction) {
  setCurrentSlide((prev) => {
    if (prev === (direction === "left" ? "Players" : "News")) {
      return "Events";
    } else if (prev === (direction === "left" ? "News" : "Events")) {
      return "Players";
    } else {
      return "News";
    }
  });
}

export default function Carousel({ localeEntry, content, breakpoint }: CarouselProps) {
  const [searchParams, setSearchParams] = useSearchParams(),
    slideParam = content ? ((searchParams.get("hs") || "News") as HeroCarouselSlides) : "Players",
    heroSlides = (content ? HERO_SLIDES : HERO_SLIDES.slice(-1)) as typeof HERO_SLIDES;

  const [currentSlide, setCurrentSlide] = useState(slideParam);

  const [interaction, setInteraction] = useState(false),
    usersDataRef = useRef<MinUserCredentials[]>([]);

  useEffect(() => {
    if (content) setCurrentSlide(slideParam);
  }, [slideParam]);

  useEffect(() => {
    // FIXME: When there is one initially, doesn't navigate right.
    // if (content && !slideParam) {
    if (content) {
      let interval: NodeJS.Timeout | undefined = undefined;

      if (!interaction) {
        interval = setInterval(() => {
          handleTransition(setCurrentSlide);
        }, 7500);
      } else {
        clearInterval(interval);
      }

      return () => clearInterval(interval);
    }
  }, [content, interaction]);

  return (
    <>
      <div
        role="group"
        aria-label={localeEntry.aria.label.chips}
        className={s.chips}
      >
        {heroSlides.map((slideName) => {
          const selected = slideName === currentSlide;

          return (
            <Button
              key={slideName}
              aria-pressed={selected}
              aria-controls="heroSlide"
              intent="chip"
              size={breakpoint ? "md" : "lrg"}
              onClick={() => {
                setInteraction(true);
                setSearchParams((params) => {
                  params.set("hs", slideName);
                  return params;
                });
              }}
              disabled={interaction && selected}
            >
              {localeEntry[slideName.toLowerCase()]}
            </Button>
          );
        })}
      </div>

      <m.div
        role="group"
        aria-roledescription="carousel"
        aria-label={localeEntry.aria.label.carousel}
        className={s.carousel}
        onClick={() => setInteraction(true)}
        onPan={(e, info) => {
          if (e.pointerType !== "mouse") {
            // TODO: Check this actually on a phone.
            const threshold = 75;

            if (info.delta.x > threshold) handleTransition(setCurrentSlide, "left");
            else if (info.delta.x < -threshold) handleTransition(setCurrentSlide, "right");
          }
        }}
      >
        <AnimatePresence mode="wait">
          <m.div
            aria-live={interaction ? "polite" : "off"}
            id="carouselInner"
            className={s.inner}
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75 }}
          >
            <div
              role="group"
              aria-roledescription="slide"
              aria-label={localeEntry[currentSlide.toLowerCase()]}
              id="heroSlide"
              className={s.slide}
              data-slide={currentSlide}
            >
              {(() => {
                const SlideComponent = Slide[currentSlide];

                const slideCont = content?.[currentSlide.toLowerCase() as keyof CarouselContentResponseDto] as any,
                  props = currentSlide === "Events"
                    ? slideCont?.entries
                    : { ...slideCont, usersDataRef, ...(currentSlide === "Players" && { localeEntry, breakpoint }) };
                  
                return (
                  <>
                    <SlideComponent {...(Array.isArray(props) ? { entries: props } : props)}/>

                    {["News", "Events"].includes(currentSlide) && slideCont?.image && (
                      <>
                        <Image src={slideCont.image.src} alt={slideCont.image.alt} fill />
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </m.div>
        </AnimatePresence>

        <Indicators
          localeEntry={localeEntry}
          heroSlides={heroSlides}
          currentSlide={currentSlide}
          setSearchParams={setSearchParams}
          interaction={interaction}
        />
      </m.div>
    </>
  );
}

const Slide = {
  News: (content: SlideEntryDto) => {
    return (
      <ScrollArea orientation="vertical">
        <SlideHeadline {...content} />
      </ScrollArea>
    );
  },
  Events: ({ entries }: { entries: SlideEntryDto[] }) => {
    return (
      <ScrollArea orientation="vertical">
        {entries.map((content, i) => (
          <Fragment key={i}>
            <SlideHeadline {...content} />
            {entries.length > 1 && i !== entries.length - 1 && <hr />}
          </Fragment>
        ))}
      </ScrollArea>
    );
  },
  Players: ({ localeEntry, usersDataRef, breakpoint }: PlayersSlideProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const user = useUser(),
      dispatch = useAppDispatch();

    const [getUsers, { isFetching: usersLoading, isUninitialized }] = useLazyGetUsersQuery(),
      [usersData, setUsersData] = useState<MinUserCredentials[]>([]),
      [count, setCount] = useState(0),
      countRef = useRef(0),
      query = useRef<any>();

    const GetRandomUsers = throttle(() => {
      query.current = getUsers({ count });
      query.current.then((res: any) => {
        if (res.isSuccess && res.data?.users) {
          setUsersData(res.data.users);
          usersDataRef.current = res.data.users; // Saves the data for when moving to other slides and coming back.
        }
      });
    }, 1000);
  
    useEffect(() => {
      if (user?.email_verified) {
        const handleUserCount = () => {
          let newCount = 0;

          if (window.innerWidth <= 562) {
            scrollAreaRef.current!.style.setProperty("--_column-count", "3");
            newCount = 6;
          } else {
            scrollAreaRef.current!.style.setProperty("--_column-count", "4");
            newCount = 8;
          }

          if (countRef.current !== newCount) {
            countRef.current = newCount;
            setCount(newCount);
            if (usersDataRef.current.length)
              setUsersData(usersDataRef.current.slice(0, newCount));
          }
        };
        window.removeEventListener("resize", handleUserCount);
        handleUserCount();
  
        window.addEventListener("resize", handleUserCount);
        return () => window.removeEventListener("resize", handleUserCount);
      }
    }, [user?.email_verified]);

    useEffect(() => {
      if (count && !usersDataRef.current.length && isUninitialized)
        GetRandomUsers();
    }, [count]);

    return (
      <>
        <div>
          <h3>{localeEntry.meet}</h3>
          <Button
            title={localeEntry.aria.title.refreshBtn}
            aria-pressed={usersLoading}
            intent="primary"
            size={breakpoint ? "md" : "lrg"}
            iconBtn
            disabled={usersLoading || !user?.email_verified}
            onClick={GetRandomUsers}
          >
            <Icon id={breakpoint ? "refresh-18" : "refresh-24"} />
          </Button>
        </div>

        <ScrollArea
          ref={scrollAreaRef}
          aria-label={localeEntry.aria.label.meet}
          aria-live="polite"
          orientation="horizontal"
          className={s.users}
        >
          {user ? (
            !user.email_verified ? (
              <p>
                {injectElementInText(localeEntry.friendsVerify, null, 
                  (text) => (
                    <Link asChild intent="primary" to="">
                      <Button
                        id="heroVerBtn"
                        onClick={() => handleSendVerifyEmail(dispatch, "heroVerBtn")}
                      >
                        {text}
                      </Button>
                    </Link>
                  ),
                  { localeMarker: true }
                )}
              </p>
            ) : usersLoading || usersData?.length ? (
              <ul>
                {usersLoading
                  ? Array.from({ length: count }).map((_, i) => (
                      <RandomUserCard key={i} breakpoint={breakpoint} />
                    ))
                  : usersData!.map((user) => (
                      <RandomUserCard key={user.username} ranUser={user} breakpoint={breakpoint} />
                    ))}
              </ul>
            ) : (
              <p>{localeEntry.noUsersFound}</p>
            )
          ) : (
            <p>
              {injectElementInText(localeEntry.loginRequired, null,
                (text) => (
                  <ModalTrigger query={{ param: "login" }} intent="primary">
                    {text}
                  </ModalTrigger>
                ),
                { localeMarker: true }
              )}
            </p>
          )}
        </ScrollArea>
      </>
    );
  },
};

function SlideHeadline(content: SlideEntryDto) {
  return (
    <div className={s.headline}>
      <h3>
        {injectElementInText(
          content.title,
          content.sequence.title_emp,
          (text) => <span>{text}</span>
        )}
      </h3>
      <p>
        {injectElementInText(
          content.description,
          content.sequence.link?.sequence,
          (text) => (
            <Link intent="primary" to={content.sequence.link!.to}>
              {text}
            </Link>
          )
        )}
      </p>
    </div>
  );
}

function RandomUserCard({ ranUser, breakpoint }: { ranUser?: MinUserCredentials; breakpoint: boolean }) {
  return (
    <li className={s.user}>
      {ranUser ? (
        <>
          <Avatar size={breakpoint ? "md" : "lrg"} user={ranUser} />

          <hgroup role="group" aria-roledescription="heading group">
            <h4 title={ranUser.username}>{ranUser.username}</h4>
            <p
              title={`${ranUser.legal_name.first} ${ranUser.legal_name.last}`}
              aria-roledescription="subtitle"
            >
              {ranUser.legal_name.first} {ranUser.legal_name.last}
            </p>
          </hgroup>
        </>
      ) : (
        <>
          <SkeletonAvatar size="lrg" />

          <div className={s.hgroupSkel}>
            <SkeletonTitle size="h4" {...(Math.random() > 0.5 && { style: { width: "65%" } })} />
            <SkeletonText size="paraXSmall" {...(Math.random() > 0.5 && { style: { width: "80%" } })} />
          </div>
        </>
      )}
    </li>
  );
}

function Indicators({
  localeEntry,
  heroSlides,
  currentSlide,
  setSearchParams,
  interaction
}: IndicatorsProps) {
  return (
    <div className={s.indicators} role="group" aria-label={localeEntry.general.indicators}>
      {heroSlides.map((slideName) => {
        const currSlide = slideName === currentSlide;

        return (
          <button
            key={slideName}
            aria-label={`${slideName} ${localeEntry.general.indicator[0]}${
              currSlide ? localeEntry.general.indicator[1] : ""
            }`}
            aria-pressed={currSlide}
            disabled={interaction && currSlide}
            onClick={() =>
              setSearchParams((params) => {
                params.set("hs", slideName);
                return params;
              })
            }
          />
        );
      })}
    </div>
  );
}
