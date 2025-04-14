import type { AnimationControls } from "framer-motion";
import type { UseLocale } from "@hooks/useLocale";
import type Direction from "@typings/Direction";

import { useRef, useState, useEffect } from "react";
import { useAnimation, m } from "framer-motion";

import { Button } from "@components/common/controls";
import { Icon, Avatar, Image, Blob } from "@components/common";

import s from "./about.module.css";

interface CarouselProps {
  localeEntry: UseLocale["content"];
  numberFormat: UseLocale["numberFormat"];
}

interface Testimonial {
  avatarUrl: string;
  quote: string;
  from: string;
}

interface TestimonialProps extends CarouselProps, Testimonial {
  index: number;
  controls: AnimationControls;
}

interface IndicatorsProps extends CarouselProps {
  numTestimonials: number;
  currentSlide: number;
}

interface CurrentState {
  slide: number;
  testimonials: Testimonial[];
}

const getTestimonials = (quotes: string[]): Testimonial[] => quotes.map((quote, i) => ({
  avatarUrl: ["/images/jamie-butler.webp", "/images/larissa-rebekka.webp", "/images/chris-simpson.webp", "/images/isaac-berthild.webp", "/images/muggsy-bogues.webp"][i],
  from: ["Jamie Butler", "Larissa Rebekka", "Chris Simpson", "Isaac Berthild", "Muggsy Bogues"][i],
  quote
}));

const rotateTestimonials = (array: Testimonial[], direction: Direction) => {
  let testimonials = [...array];

  if (direction === "left") testimonials.push(testimonials.shift()!);
  else testimonials.unshift(testimonials.pop()!);

  return testimonials;
};

export default function Carousel({ localeEntry, numberFormat }: CarouselProps) {
  const interactionRef = useRef(false),
    numTestimonials = localeEntry.quotes.length;

  const [transitioning, setTransitioning] = useState(false),
    [current, setCurrent] = useState<CurrentState>({
      slide: 1,
      testimonials: getTestimonials(localeEntry.quotes)
    });

  const controls = useAnimation();

  const handleTransition = async (direction: Direction) => {
    setTransitioning(true);
    const newSlide =
      direction === "left"
        ? (current.slide - 1 + numTestimonials) % numTestimonials
        : (current.slide + 1) % numTestimonials;

    const testimonials = rotateTestimonials(current.testimonials, direction);

    setCurrent((prev) => ({ ...prev, slide: newSlide }));

    await controls.start((index) => {
      const carousel = !index && index !== 0,
        prevSlide = index === 2,
        newSlide = direction === "left" ? index === 3 : index === 1;

      return {
        ...(carousel && {
          x: direction === "left" ? ["-50%", "-69.39%"] : ["-50%", "-30.62%"],
        }),
        y: newSlide ? "12px" : 0,
        ...((newSlide || prevSlide) && { scale: prevSlide ? 1 : 1.21 }),
        marginInline: newSlide ? "2rem" : 0,

        transition: {
          x: {
            type: "spring",
            bounce: 0.26,
            duration: interactionRef.current ? 2.68 : 3.68,
          },
          y: { ease: "easeInOut", duration: 0.5 },
          scale: { ease: "easeInOut", duration: 1 },
        },
        transitionEnd: { ...(carousel && { x: "-50%" }) }
      };
    });

    setCurrent((prev) => ({ ...prev, testimonials }));
    setTransitioning(false);
  };

  useEffect(() => {
    if (!interactionRef.current) {
      const interval = setInterval(() => handleTransition("right"), 6500);
      return () => clearInterval(interval);
    }
  }, [current]);

  return (
    <div
      className={s.carContainer}
      role="group"
      aria-roledescription="carousel"
      aria-label={localeEntry.aria.label.testimonials}
    >
      <div className={s.carousel}>
        <Button
          aria-label={localeEntry.aria.label.btn[0]}
          aria-controls="carouselInner"
          intent="primary"
          size="lrg"
          iconBtn
          className={s.left}
          disabled={transitioning}
          onClick={() => {
            interactionRef.current = true;
            handleTransition("left");
          }}
        >
          <Icon id="expand-22" />
        </Button>
        <div className={s.innerWrapper}>
          <m.div
            aria-live={interactionRef.current ? "polite" : "off"}
            id="carouselInner"
            className={s.inner}
            animate={controls}
          >
            {current.testimonials.map((user, i) => (
              <Testimonial
                key={user.from}
                localeEntry={localeEntry}
                numberFormat={numberFormat}
                avatarUrl={user.avatarUrl}
                quote={user.quote}
                from={user.from}
                index={i}
                controls={controls}
              />
            ))}
          </m.div>
        </div>
        <Button
          aria-label={localeEntry.aria.label.btn[1]}
          aria-controls="carouselInner"
          intent="primary"
          size="lrg"
          iconBtn
          className={s.right}
          disabled={transitioning}
          onClick={() => {
            interactionRef.current = true;
            handleTransition("right");
          }}
        >
          <Icon id="expand-22" />
        </Button>
      </div>

      <Indicators
        localeEntry={localeEntry}
        numberFormat={numberFormat}
        numTestimonials={numTestimonials}
        currentSlide={current.slide}
      />

      <Blob svgWidth={1226} svgHeight={468} preserveAspectRatio="xMidYMax meet">
        <ellipse
          cx="463"
          cy="84"
          rx="463"
          ry="84"
          transform="translate(150 150)"
          fill="rgba(178,67,178,0.15)"
        />
      </Blob>
    </div>
  );
}

function Testimonial({
  localeEntry,
  numberFormat,
  avatarUrl,
  quote,
  from,
  index,
  controls
}: TestimonialProps) {
  const currentSlide = index === 2;

  return (
    <m.article
      aria-label={numberFormat().format(index + 1)}
      aria-roledescription="slide"
      {...(!currentSlide && { "aria-hidden": "true" })}
      className={s.testimonial}
      data-current={currentSlide}
      animate={controls}
      custom={index}
    >
      <span className={s.bg} />
      
      <Avatar size="xl" user={{ avatar_url: avatarUrl }} />
      <div>
        <p>{quote}</p>
        <div>
          <h5>
            <Icon id="quote-12" /> {from}
          </h5>
          <div className={s.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Image
                key={i}
                src="/images/star.png"
                alt={localeEntry.aria.alt.star}
                load={false}
              />
            ))}
          </div>
        </div>
      </div>
    </m.article>
  );
}

function Indicators({ localeEntry, numberFormat, numTestimonials, currentSlide }: IndicatorsProps) {
  return (
    <div
      className={s.indicators}
      role="list"
      aria-label={localeEntry.aria.label.indicators}
    >
      {Array.from({ length: numTestimonials }).map((_, i) => {
        const selected = currentSlide === 0 ? 5 : currentSlide;

        return (
          <span
            key={i}
            role="listitem"
            aria-label={`${localeEntry.aria.label.indicator[0]} ${numberFormat().format(i + 1)}${
              i + 1 === selected ? localeEntry.aria.label.indicator[1] : ""
            }`}
            aria-current={i + 1 === selected}
          />
        );
      })}
    </div>
  );
}
