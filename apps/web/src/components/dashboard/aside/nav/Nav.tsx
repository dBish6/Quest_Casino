import type { LocaleContextValues } from "@components/LocaleProvider";
import type { BreakpointContextValues } from "@components/BreakpointProvider";

import { useLocation } from "react-router-dom";
import { useState } from "react";

import { type AvailableLocales, LANGUAGES } from "@qc/constants";

import { delay } from "@qc/utils";

import useLocale from "@hooks/useLocale";

import { useAppSelector } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";

import { useLocaleChangeMutation } from "@authFeat/services/authApi";

import { Icon, Link } from "@components/common";
import { ModalTrigger } from "@components/modals";
import { Select } from "@components/common/controls";
import { Spinner } from "@components/loaders";

import s from "./nav.module.css";

interface LanguageProps {
  locale: string;
  localeContent: ReturnType<LocaleContextValues["getContent"]>;
  setLocaleData: LocaleContextValues["setLocaleData"];
  viewport: BreakpointContextValues["viewport"];
}

export default function Nav({ viewport }: { viewport: BreakpointContextValues["viewport"] }) {
  const location = useLocation(),
    { type, content, setLocaleData } = useLocale("Nav");

  return (
    <div className={s.container}>
      <Divider heading={content.profile} divide={false} />
      <nav>
        <div>
          <Link
            {...(location.pathname.match(/^\/profile(\/)?$/) && {
              "aria-current": "page"
            })}
            to="/profile"
          >
            <Icon aria-hidden="true" id={viewport === "small" ? "edit-14" : "edit-16"} /> {content.viewEditProfile}
          </Link>
          <Link to="/profile/settings" nav>
            <Icon aria-hidden="true" id={viewport === "small" ? "adjust-14" : "adjust-16"} /> {content.settings}
          </Link>
        </div>

        <Divider heading={content.menu} />
        <div className={s.menu}>
          {/* FIXME: */}
          <Link
            to={{ pathname: "/home", hash: "games" }}
            {...(location.hash.includes("games") && { "aria-current": "location" })}
          >
            <Icon aria-hidden="true" id={viewport === "small" ? "joystick-14" : "joystick-16"} /> {content.general.games}
          </Link>

          <ModalTrigger
            query={{ param: "menu", value: "Leaderboard" }}
            {...(location.search.includes("menu=Leaderboard", -1) && {
              "data-current": "true"
            })}
          >
            <Icon aria-hidden="true" id={viewport === "small" ? "list-14" : "list-16"} /> {content.leaderboard}
          </ModalTrigger>
          <ModalTrigger
            query={{ param: "menu", value: "Quests" }}
            {...(location.search.includes("menu=Quests", -1) && {
              "data-current": "true"
            })}
          >
            <Icon aria-hidden="true" id={viewport === "small" ? "scroll-14" : "scroll-16"} /> {content.quests}
          </ModalTrigger>
          <ModalTrigger
            query={{ param: "menu", value: "Bonuses" }}
            {...(location.search.includes("menu=Bonuses", -1) && {
              "data-current": "true"
            })}
          >
            <Icon aria-hidden="true" id={viewport === "small" ? "gift-14" : "gift-16"} /> {content.bonuses}
          </ModalTrigger>
        </div>
      </nav>

      <Languages
        locale={type}
        localeContent={content}
        setLocaleData={setLocaleData}
        viewport={viewport}
      />

      <Divider />
      <nav>
        <div>
          <Link to={{ pathname: "/about" }} nav>{content.about}</Link>
          <Link to="/support" nav>{content.support}</Link>
        </div>
        <div>
          <Link to="/terms" nav>{content.terms}</Link>
          <Link to="/privacy-policy" nav>{content.policy}</Link>
        </div>
      </nav>
    </div>
  );
}

function Divider({ heading, divide = true }: { heading?: string, divide?: boolean }) {
  const Line = divide ? "hr" : "div"

  return (
    <div className={s.divider}>
      <Line className={s.line} />
      {heading && <h4>{heading}</h4>}
    </div>
  );
}

function Languages({ locale, localeContent, setLocaleData, viewport }: LanguageProps) {
  const [emitLocaleChange] = useLocaleChangeMutation(),
    [loading, setLoading] = useState(false);

  const user = useAppSelector(selectUserCredentials);

  return (
    <>
      <Divider heading={localeContent.language} />
      <Select
        label={localeContent.language}
        intent="primary"
        size={viewport === "small" ? "md" : "lrg"}
        id="languageSelect"
        defaultValue={locale}
        Loader={<Spinner intent="primary" size="sm" />}
        loaderTrigger={loading}
        disabled={loading}
        onInput={(e) => {
          const locale = e.currentTarget.value as AvailableLocales;
          setLoading(true);
          if (user?.email_verified) {
            emitLocaleChange({ locale })
              .then((res) => {
                if (res.data?.status === "ok") setLocaleData(locale);
              })
              .finally(() => delay(1850, () => setLoading(false)));
          } else {
            setLocaleData(locale);
            setLoading(false);
          }
        }}
      >
        {Object.values(LANGUAGES).map((lang) => (
          <option key={lang.locale} value={lang.locale}>
            {lang.name}
          </option>
        ))}
      </Select>
    </>
  );
}
