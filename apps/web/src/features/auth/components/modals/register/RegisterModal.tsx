import type RegisterBodyDto from "@qc/typescript/dtos/RegisterBodyDto";

import { useFetcher } from "react-router-dom";
import { useState } from "react";
import { Title } from "@radix-ui/react-dialog";

import formatPhoneNumber from "@authFeat/utils/formatPhoneNumber";
import injectElementInText from "@utils/injectElementInText";

import useLocale from "@hooks/useLocale";
import useForm from "@hooks/useForm";
import useWorldData from "@authFeat/hooks/useWorldData";
import useSwitchModal from "@authFeat/hooks/useSwitchModal";
import useHandleUserValidationResponse from "@authFeat/hooks/useHandleUserValidationResponse";

import { useRegisterMutation, useLoginGoogleMutation } from "@authFeat/services/authApi";

import { ModalTemplate, ModalTrigger } from "@components/modals";
import { Form } from "@components/form";
import { Button, Input, Select } from "@components/common/controls";
import { Icon, Link } from "@components/common";
import { LoginWithGoogle } from "@authFeat/components/loginWithGoogle";
import { Spinner } from "@components/loaders";

import s from "./registerModal.module.css";

export default function RegisterModal() {
  const { content } = useLocale("RegisterModal");

  const fetcher = useFetcher(),
    { formRef, form, setLoading, setError, setErrors } = useForm<
      RegisterBodyDto & { con_password: string; calling_code: string }
    >();

  const { handleSwitch } = useSwitchModal("register");

  const {
    worldData,
    selected,
    setSelected,
    getCountries,
    getRegions,
    loading
  } = useWorldData(setError);

  const [
    postRegister,
    {
      data: registerData,
      error: registerError,
      isSuccess: registerSuccess,
      reset: registerReset
    },
  ] = useRegisterMutation();

  const [googleLoading, setGoogleLoading] = useState(false),
    [
      postLoginGoogle,
      {
        error: loginGoogleError,
        isLoading: loginGoogleLoading,
        reset: loginGoogleReset
      },
    ] = useLoginGoogleMutation();

  const processing = form.processing || loginGoogleLoading || googleLoading;

  useHandleUserValidationResponse(fetcher, { formRef, setLoading, setErrors }, postRegister);

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey="register"
      width="496px"
      className={s.modal}
      onCloseAutoFocus={() => {
        setErrors({});
        registerReset();
        loginGoogleReset();
      }}
    >
      {() => (
        <>
          <div className="head">
            <hgroup>
              <Icon aria-hidden="true" id="badge-48" />
              <Title asChild>
                <h2>{content.title}</h2>
              </Title>
            </hgroup>
            <div>
              <span>*</span> <span>{content.required}</span>
            </div>
          </div>

          <Form
            ref={formRef}
            fetcher={fetcher}
            method="post"
            action="/action/user/validate"
            onSubmit={() => {
              setLoading(true);
              registerReset();
              loginGoogleReset();
            }}
            formLoading={processing}
            resSuccessMsg={
              registerSuccess &&
              injectElementInText(registerData.message, "log in", (text) => (
                <ModalTrigger
                  query={{ param: "login" }}
                  intent="primary"
                  onClick={handleSwitch}
                >
                  {text}
                </ModalTrigger>
              ))
            }
            resError={fetcher.data?.ERROR || registerError || loginGoogleError}
            clearErrors={() => setErrors({})}
            noBots
          >
            <div className="inputs">
              <div role="group">
                <Input
                  label={content.general.form.user.first_name}
                  intent="primary"
                  size="lrg"
                  id="first_name"
                  name="first_name"
                  required="show"
                  error={form.error.first_name}
                  disabled={processing}
                  onInput={() => setError("first_name", "")}
                />
                <Input
                  label={content.general.form.user.last_name}
                  intent="primary"
                  size="lrg"
                  id="last_name"
                  name="last_name"
                  required="show"
                  error={form.error.last_name}
                  disabled={processing}
                  onInput={() => setError("last_name", "")}
                />
              </div>
              <Input
                label={content.general.form.user.email}
                intent="primary"
                size="lrg"
                id="email"
                name="email"
                type="email"
                required="show"
                error={form.error.email}
                disabled={processing}
                onInput={() => setError("email", "")}
              />
              <Input
                label={content.general.form.user.username}
                intent="primary"
                size="lrg"
                id="username"
                name="username"
                required="show"
                error={form.error.username}
                disabled={processing}
                onInput={() => setError("username", "")}
              />
              <div role="group">
                <Input
                  label={content.general.form.user.password}
                  intent="primary"
                  size="lrg"
                  id="password"
                  name="password"
                  type="password"
                  required="show"
                  error={form.error.password}
                  disabled={processing}
                  onInput={() => setError("password", "")}
                />
                <Input
                  label={content.general.form.user.con_password}
                  intent="primary"
                  size="lrg"
                  id="con_password"
                  name="con_password"
                  type="password"
                  required="show"
                  error={form.error.con_password}
                  disabled={processing}
                  onInput={() => setError("con_password", "")}
                />
              </div>
              <div role="group">
                <Select
                  label={content.general.form.user.country}
                  intent="primary"
                  size="lrg"
                  id="country"
                  name="country"
                  required="show"
                  error={
                    form.error.country ||
                    (typeof worldData.countries === "string"
                      ? worldData.countries
                      : undefined)
                  }
                  Loader={<Spinner intent="primary" size="sm" />}
                  loaderTrigger={loading.countries}
                  disabled={processing}
                  onFocus={() => {
                    getCountries();
                    getRegions();
                  }}
                  onInput={(e) => {
                    setError("country", "");
                    setSelected((prev) => ({
                      ...prev,
                      country: (e.target as HTMLSelectElement).value
                    }));
                  }}
                >
                  {typeof worldData.countries !== "string" &&
                    worldData.countries?.length &&
                    worldData.countries.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                </Select>
                <Select
                  label={content.general.form.user.region}
                  intent="primary"
                  size="lrg"
                  id="region"
                  name="region"
                  error={
                    typeof selected.regions === "string"
                      ? selected.regions
                      : undefined
                  }
                  Loader={<Spinner intent="primary" size="sm" />}
                  loaderTrigger={loading.regions}
                  disabled={processing || !selected.country}
                  onFocus={getRegions}
                >
                  {selected.regions.length &&
                    typeof selected.regions !== "string" &&
                    selected.regions.map((region) => (
                      <option key={region.name} value={region.name}>
                        {region.name}
                      </option>
                    ))}
                </Select>
              </div>

              <div role="group">
                <Select
                  label={content.general.form.user.calling_code}
                  intent="callingCode"
                  size="lrg"
                  id="calling_code"
                  name="calling_code"
                  error={form.error.calling_code}
                  Loader={<Spinner intent="primary" size="sm" />}
                  loaderTrigger={loading.countries}
                  disabled={processing}
                  onFocus={getCountries}
                  onInput={() => setError("calling_code", "")}
                >
                  {typeof worldData.countries !== "string" &&
                    worldData.countries?.length &&
                    worldData.countries.map((country) => (
                      <option key={country.name} value={country.callingCode}>
                        {country.abbr} {country.callingCode}
                      </option>
                    ))}
                </Select>
                <Input
                  label={content.general.form.user.phone_number}
                  intent="primary"
                  size="lrg"
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  error={form.error.phone_number}
                  onInput={(e) => {
                    setError("phone_number", "");
                    formatPhoneNumber(e.target as HTMLInputElement);
                  }}
                  disabled={processing}
                />

                {/* TODO: I am 18 years old or older or is it older than 18? checkbox. */}
              </div>
            </div>

            <div className={s.submit}>
              <Button
                aria-live="polite"
                intent="primary"
                size="xl"
                type="submit"
                className="formBtn"
                disabled={processing}
              >
                {form.processing ? (
                  <Spinner intent="primary" size="md" />
                ) : (
                  content.title
                )}
              </Button>
              <p>
                {injectElementInText(
                  content.agreement,
                  null,
                  (text) => [
                    <Link key={0} intent="primary" to="/terms">
                      {text[0]}
                    </Link>,
                    <Link key={1} intent="primary" to="/privacy-policy">
                      {text[1]}
                    </Link>
                  ],
                  { localeMarker: true, injectAll: true }
                )}
              </p>
            </div>
          </Form>

          <LoginWithGoogle
            queryKey="register"
            postLoginGoogle={postLoginGoogle}
            setGoogleLoading={setGoogleLoading}
            processing={{
              google: googleLoading,
              form: form.processing,
              all: processing
            }}
          />

          <span className={s.already}>
            {injectElementInText(
              content.already,
              null,
              (text) => (
                <ModalTrigger
                  query={{ param: "login" }}
                  intent="primary"
                  onClick={handleSwitch}
                >
                  {text}
                </ModalTrigger>
              ),
              { localeMarker: true }
            )}
          </span>
        </>
      )}
    </ModalTemplate>
  );
}

RegisterModal.restricted = "loggedIn";
