import type { FetcherWithComponents } from "react-router-dom";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

import { forwardRef, isValidElement, useEffect } from "react";

import injectElementInText from "@utils/injectElementInText";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import useLocale from "@hooks/useLocale";

import { Link } from "@components/common";

import s from "./form.module.css";

export interface FormProps extends Omit<React.ComponentProps<"form">, "aria-errormessage"> {
  fetcher?: FetcherWithComponents<any>;
  formLoading?: boolean;
  resSuccessMsg?: React.ReactNode;
  resError?: FetchBaseQueryError | SerializedError | string | JSX.Element;
  clearErrors?: () => void;
  noBots?: boolean;
  provideLang?: boolean;
}

const Form = forwardRef<HTMLFormElement, React.PropsWithChildren<FormProps>>(
  ({ children, fetcher, formLoading, resSuccessMsg, resError, clearErrors, noBots, provideLang, className, ...props }, ref) => {
    const { type, content, getContent } = useLocale("Form");

    const FormElm = (fetcher ? fetcher.Form : "form") as React.ElementType<React.ComponentProps<"form">>;

    useEffect(() => {
      if (resSuccessMsg && clearErrors) clearErrors();
    }, [resSuccessMsg]);

    return (
      <>
        {!formLoading && (
          <>
            {resSuccessMsg && (
              <span className={s.successMsg}>{resSuccessMsg}</span>
            )}
            {resError && (
              isFetchBaseQueryError(resError) ? (
                (resError.status as number) >= 400 && (resError.status as number) < 599 && (
                  <span role="alert" id="globalFormError" className={s.errorMsg}>
                    {[400, 401, 403, 409].includes(resError.status as number) ? (
                      <>
                        {[400, 409].includes(resError.status as number) && resError.data!.ERROR}
                        {resError.status === 401 && `${content.general.unauthorized}`}
                        {resError.status === 403 && `${content.general.forbidden}`}
                      </>
                    ) : (
                      (() => {
                        const localeApi = getContent("api");
                        return injectElementInText(
                          (resError.status as number) >= 400 && (resError.status as number) < 500 && resError.data?.ERROR // if within 400s.
                            ? localeApi.error.unexpectedFull.replace("{{message}}{{refresh}}", resError.data.ERROR)
                            : localeApi.error.unexpectedFull
                                .replace("{{message}}", localeApi.error.unexpectedServer)
                                .replace("{{refresh}}", localeApi.error.tryRefresh),
                          null,
                          (text) => (
                            <Link intent="primary" to="/support">
                              {text}
                            </Link>
                          ),
                          { localeMarker: true }
                        )
                      })()
                    )}
                  </span>
                )
              ) : isValidElement(resError) ? (
                <span role="alert" id="globalFormError" className={s.errorMsg}>
                  {resError}
                </span>
              ) : (
                <span role="alert" id="globalFormError" className={s.errorMsg}>
                  {typeof resError === "string" ? (
                    resError
                  ) : (
                    (() => {
                      const localeApi = getContent("api"),
                        message = (resError as SerializedError)?.message || "Serialization error";

                      return injectElementInText(
                        localeApi.error.unexpectedFull
                          .replace(
                            "{{message}}",
                            message + (["en", "fr"].includes(type) && !message.endsWith(".") ? "." : "")
                          )
                          .replace("{{refresh}}", ""),
                        null,
                        (text) => (
                          <Link intent="primary" to="/support">
                            {text}
                          </Link>
                        ),
                        { localeMarker: true }
                      )
                    })()
                  )}
                </span>
              )
            )}
          </>
        )}
        <FormElm
          ref={ref}
          {...(resError && { "aria-errormessage": "globalFormError" })}
          autoComplete="off"
          noValidate
          className={className}
          {...props}
        >
          {children}
          {noBots && <input type="hidden" id="bot" name="bot" />}
          {/* For react router actions. */}
          {(provideLang || props.action === "/action/user/validate") && (
            <input
              type="hidden"
              id="lang"
              name="lang"
              value={typeof document !== "undefined" ? document.documentElement.lang : ""}
            />
          )}
        </FormElm>
      </>
    );
  }
);

export default Form;
