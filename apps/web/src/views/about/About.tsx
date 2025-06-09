import useLocale from "@hooks/useLocale";

import { Main } from "@components/dashboard";
import Carousel from "./_Carousel";
import { Link } from "@components/common";

import s from "./about.module.css";

export default function About() {
  const { content, numberFormat } = useLocale();

  return (
    <Main className={s.about}>
      <section aria-labelledby="hWelcome" className={s.welcome}>
        <h2 id="hWelcome">{content.section.welcome.title} 👋</h2>
        <p>
          {content.section.welcome.para}
        </p>
      </section>

      <section aria-labelledby="hSafety" className={s.safety}>
        <h2 id="hSafety">{content.section.safety.title}</h2>
        <p>{content.section.safety.para}</p>
      </section>

      <section aria-labelledby="hFair" className={s.play}>
        <h2 id="hFair">{content.section.fair.title}</h2>
        <p>{content.section.fair.para}</p>
      </section>

      <section aria-labelledby="hCommunity" className={s.community}>
        <h2 id="hCommunity">{content.section.community.title}</h2>
        {content.section.community.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}

        <Carousel
          localeEntry={{ ...content.Carousel, general: content.general }}
          numberFormat={numberFormat}
        />
      </section>

      <footer>
        <p>{content.footer.para}</p>
        <Link
          intent="primary"
          to="https://www.davidbishop.info"
          external
          title={content.footer.aria.title.portfolio}
        >
          https://www.davidbishop.info
        </Link>
      </footer>
    </Main>
  );
}
