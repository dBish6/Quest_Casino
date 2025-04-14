import useLocale from "@hooks/useLocale";

import injectElementInText from "@utils/injectElementInText";

import { Main } from "@components/dashboard";
import { Link } from "@components/common";

import s from "./legal.module.css";

export default function PrivacyPolicy() {
  const { content, dateTimeFormat } = useLocale();

  return (
    <Main className={s.policy}>
      <header>
        <p className={s.lastUpdated}>
          {content.header.lastUpdated}{" "}
          {dateTimeFormat({
            year: "numeric",
            month: "long",
            day: "numeric"
          }).format(new Date(2025, 2, 13))}
        </p>
        {content.header.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </header>

      <section aria-labelledby="hInterpretation">
        <h2 id="hInterpretation">{content.section.interAndDef.title}</h2>

        <h3>{content.section.interAndDef.sub.interpretation.title}</h3>
        <p>{content.section.interAndDef.sub.interpretation.para}</p>

        <h3>{content.section.interAndDef.sub.definitions.title}</h3>
        <p className={s.ulTxt}>{content.section.interAndDef.sub.definitions.para}</p>
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

      <section aria-labelledby="hEligibility">
        <h2 id="hEligibility">{content.section.eligibility.title}</h2>
        {content.section.eligibility.para.map((item: string, i: number) => (
          <p key={i}>
            {injectElementInText(item, null, 
              (text) => <strong>{text}</strong>,
              { localeMarker: true } 
            )}
          </p>
        ))}
      </section>

      <section aria-labelledby="hCollectingData">
        <h2 id="hCollectingData">{content.section.collectingData.title[0]}</h2>
        <h3>{content.section.collectingData.title[1]}</h3>

        <h4>{content.section.collectingData.sub.personal.title}</h4>
        <p className={s.ulTxt}>
          {content.section.collectingData.sub.personal.para}
        </p>
        <ul>
          {content.section.collectingData.sub.personal.list.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h4>{content.section.collectingData.sub.usage.title}</h4>
        {content.section.collectingData.sub.usage.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}

        <h3>{content.section.collectingData.sub.usePersonal.title}</h3>
        <p>{content.section.collectingData.sub.usePersonal.para[0]}</p>
        <ul className={s.useData}>
          {content.section.collectingData.sub.usePersonal.list[0].map((item: string, i: number) => (
            <li key={i}>
              {injectElementInText(item, null, 
                (text) => <strong>{text}</strong>,
                { localeMarker: true }
              )}
            </li>
          ))}
        </ul>
        <p className={s.ulTxt}>{content.section.collectingData.sub.usePersonal.para[1]}</p>
        <ul>
          {content.section.collectingData.sub.usePersonal.list[1].map((item: string, i: number) => (
            <li key={i}>
              {injectElementInText(item, null, 
                (text) => <strong>{text}</strong>,
                { localeMarker: true }
              )}
            </li>
          ))}
        </ul>

        <h3>{content.section.collectingData.sub.retention.title}</h3>
        {content.section.collectingData.sub.retention.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}

        <h3>{content.section.collectingData.sub.transfer.title}</h3>
        {content.section.collectingData.sub.transfer.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}

        <h3>{content.section.collectingData.sub.delete.title}</h3>
        {content.section.collectingData.sub.delete.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}

        <h3>{content.section.collectingData.sub.disclosure.title}</h3>
        <h4>{content.section.collectingData.sub.businessTran.title}</h4>
        <p>{content.section.collectingData.sub.businessTran.para}</p>

        <h4>{content.section.collectingData.sub.law.title}</h4>
        <p>{content.section.collectingData.sub.law.para}</p>

        <h4>{content.section.collectingData.sub.otherLegal.title}</h4>
        <p className={s.ulTxt}>{content.section.collectingData.sub.otherLegal.para}</p>
        <ul>
          {content.section.collectingData.sub.otherLegal.list.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3>{content.section.collectingData.sub.security.title}</h3>
        <p>{content.section.collectingData.sub.security.para}</p>
      </section>

      <section aria-labelledby="hExternalLinks">
        <h2 id="hExternalLinks">{content.section.externalLinks.title}</h2>
        {content.section.externalLinks.para.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </section>

      <section aria-labelledby="hPolicyChanges">
        <h2 id="hPolicyChanges">{content.section.changes.title}</h2>
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
