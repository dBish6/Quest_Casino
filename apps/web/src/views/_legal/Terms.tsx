import useLocale from "@hooks/useLocale";

import injectElementInText from "@utils/injectElementInText";

import { Main } from "@components/dashboard";
import { Link } from "@components/common";

import s from "./legal.module.css";

export default function Terms() {
  const { content, dateTimeFormat } = useLocale();

  return (
    <Main className={s.terms}>
      <header>
        <p className={s.lastUpdated}>
          {content.header.lastUpdated}{" "}
          {dateTimeFormat({
            year: "numeric",
            month: "long",
            day: "numeric"
          }).format(new Date(2025, 2, 13))}
        </p>
        <p>{content.header.para}</p>
      </header>

      <section aria-labelledby="hInterpretation">
        <h2 id="hInterpretation">{content.section.interAndDef.title}</h2>

        <h3>{content.section.interAndDef.sub.interpretation.title}</h3>
        <p>{content.section.interAndDef.sub.interpretation.para}</p>

        <h3>{content.section.interAndDef.sub.definitions.title}</h3>
        <p>{content.section.interAndDef.sub.definitions.para}</p>
        <ul>
          {content.section.interAndDef.sub.definitions.list.map((item: string, i: number) => (
            <li key={i}>
              {injectElementInText(item, null,
                (text) => <strong>{text}</strong>,
                { localeMarker: true }
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hAcknowledgment">
        <h2 id="hAcknowledgment">{content.section.acknowledgment.title}</h2>
        {content.section.acknowledgment.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hProfiles">
        <h2 id="hProfiles">{content.section.profiles.title}</h2>
        {content.section.profiles.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}

        <h3>{content.section.profiles.sub.generated.title}</h3>
        {content.section.profiles.sub.generated.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hProperty">
        <h2 id="hProperty">{content.section.property.title}</h2>
        {content.section.property.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hExternalLinks">
        <h2 id="hExternalLinks">{content.section.externalLinks.title}</h2>
        {content.section.externalLinks.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hTermination">
        <h2 id="hTermination">{content.section.termination.title}</h2>
        {content.section.termination.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hLiability">
        <h2 id="hLiability">{content.section.liability.title}</h2>
        {content.section.liability.para.map((para: string, i: number) => (
          <p key={i}>{i === 0 ? para.replace(/[{}]/g, "") : para}</p>
        ))}
      </section>

      <section aria-labelledby="hAsIs">
        <h2 id="hAsIs">{content.section.asIs.title}</h2>
        {content.section.asIs.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hGoverningLaw">
        <h2 id="hGoverningLaw">{content.section.governingLaw.title}</h2>
        {content.section.governingLaw.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hDisputes">
        <h2 id="hDisputes">{content.section.disputes.title}</h2>
        <p>{content.section.disputes.para}</p>
      </section>

      <section aria-labelledby="hEuropean">
        <h2 id="hEuropean">{content.section.european.title}</h2>
        <p>{content.section.european.para}</p>
      </section>

      <section aria-labelledby="hUnitedStates">
        <h2 id="hUnitedStates">{content.section.unitedStates.title}</h2>
        <p>{content.section.unitedStates.para}</p>
      </section>

      <section aria-labelledby="hSeverability">
        <h2 id="hSeverability">{content.section.severAndWaiver.title}</h2>

        <h3>{content.section.severAndWaiver.sub.severability.title}</h3>
        <p>{content.section.severAndWaiver.sub.severability.para}</p>

        <h3>{content.section.severAndWaiver.sub.waiver.title}</h3>
        <p>{content.section.severAndWaiver.sub.waiver.para}</p>
      </section>

      <section aria-labelledby="hTranslation">
        <h2 id="hTranslation">{content.section.translation.title}</h2>
        <p>{content.section.translation.para}</p>
      </section>

      <section aria-labelledby="hTermsChanges">
        <h2 id="hTermsChanges">{content.section.changes.title}</h2>
        {content.section.changes.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hContact">
        <h2 id="hContact">{content.section.contact.title}</h2>
        <p className={s.ulTxt}>{content.section.contact.para}</p>
        <ul>
          {content.section.contact.list.map((item: string, i: number) => (
            <li key={i}>
              {i === 0 ? (
                <>
                  {item}{" "}
                  <Link
                    intent="primary"
                    to="mailto:davidbish2002@hotmail.com"
                    external
                  >
                    davidbish2002@hotmail.com
                  </Link>
                </>
              ) : (
                <>
                  {item}{" "}
                  <Link intent="primary" to="/support">
                    https://questcasino.org/support
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Main>
  );
}
