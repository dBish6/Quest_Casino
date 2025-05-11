import type { FetcherWithComponents } from "react-router-dom";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

import { forwardRef, isValidElement, useEffect } from "react";

import GENERAL_UNAUTHORIZED_MESSAGE from "@authFeat/constants/GENERAL_UNAUTHORIZED_MESSAGE";
import GENERAL_FORBIDDEN_MESSAGE from "@authFeat/constants/GENERAL_FORBIDDEN_MESSAGE";

import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

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
                        {resError.status === 401 && `${GENERAL_UNAUTHORIZED_MESSAGE} `}
                        {resError.status === 403 && `${GENERAL_FORBIDDEN_MESSAGE} `}
                      </>
                    ) : (
                      <>
                        {(resError.status as number) >= 400 && (resError.status as number) < 500 && resError.data?.ERROR // if within 400s.
                          ? resError.data.ERROR + " "
                          : "An unexpected server error occurred. Please try refreshing the page. "}
                        If the error persists, feel free to reach out to{" "}
                        <Link intent="primary" to="/support">
                          support
                        </Link>
                        .
                      </>
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
                    <>
                      {(resError as SerializedError)?.message || "Serialization error"}
                      {!(resError as SerializedError)?.message?.endsWith(".") ? ". " : " "}
                      If the error persists, feel free to reach out to{" "}
                      <Link intent="primary" to="/support">
                        support
                      </Link>.
                    </>
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
