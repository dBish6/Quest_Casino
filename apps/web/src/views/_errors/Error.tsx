import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import injectElementInText from "@utils/injectElementInText";
import { history } from "@utils/History";

import useLocale from "@hooks/useLocale";

import { useAppDispatch, useAppSelector } from "@redux/hooks";
import { selectUserCredentials } from "@authFeat/redux/authSelectors";
import { attemptLogout } from "@authFeat/services/handleLogout";

import { Main } from "@components/dashboard";
import { Button } from "@components/common/controls";
import { Link } from "@components/common";

import s from "./errors.module.css";

export interface ErrorPageProps {
  status: number;
}

const LOGOUT_STATUSES = new Set([401, 403]);

export default function Error({ status }: ErrorPageProps) {
  const { content } = useLocale(),
    title = content.title;

  const [_, setSearchParams] = useSearchParams(),
    user = useAppSelector(selectUserCredentials),
    dispatch = useAppDispatch();

  if (user && LOGOUT_STATUSES.has(status)) {
    useEffect(() => {
      attemptLogout(dispatch, user.username, setSearchParams);
    }, []);
  }

  return (
    <Main className={s.error}>
      <hgroup role="group" aria-roledescription="heading group">
        <h2>
          {injectElementInText(
            title,
            null,
            (text) => (
              <span>{text}</span>
            ),
            { localeMarker: true }
          )}
        </h2>
        <p aria-roledescription="subtitle">
          {status === 401 ? content.general.unauthorized : content.para}
        </p>
      </hgroup>

      {[500, 404].includes(status) && (
        <Button
          intent="primary"
          size="xl"
          {...(title.includes("Page")
            ? {
                asChild: true
              }
            : {
                onClick: () => history.replacePath("/home")
              })}
        >
          {content.home ? (
            <Link aria-label={content.general.aria.label.logoTitle} to="/home">
              {content.home}
            </Link>
          ) : (
            content.general.refresh
          )}
        </Button>
      )}
    </Main>
  );
}
