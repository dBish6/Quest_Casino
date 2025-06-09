import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";
import type { LocaleEntry } from "@typings/Locale";

import { useRef, useState, useEffect } from "react";
import { m } from "framer-motion"

import { fadeInOut } from "@utils/animations";
import formatPhoneNumber from "@authFeat/utils/formatPhoneNumber";
import injectElementInText from "@utils/injectElementInText";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import { useHandleUpdate } from "../../_hooks/useHandleUpdate";
import useWorldData from "@authFeat/hooks/useWorldData";

import { useAppDispatch } from "@redux/hooks";

import { useUpdateProfileMutation, useSendConfirmPasswordEmailMutation } from "@authFeat/services/authApi";
import handleRevokePasswordReset from "@authFeat/services/handleRevokePasswordReset";

import { Icon, Link } from "@components/common";
import { Form } from "@components/form";
import { Button, Input, Select } from "@components/common/controls";
import { Spinner } from "@components/loaders";

import s from "../../profile.module.css";

export interface ParsedPhone {
  callingCode?: string;
  number?: string
}

interface ProfilePersonalProps {
  localeEntry: LocaleEntry;
  user: UserProfileCredentials;
}

function parsePhoneNumber(phoneNumber: string | undefined) {
  if (!phoneNumber) return {};
  const [callingCode, ...rest] = phoneNumber.split(" ");
  return { callingCode, number: rest.join(" ") };
};

export default function Personal({ localeEntry, user }: ProfilePersonalProps) {
  const [parsedPhone, setParsedPhone] = useState<ParsedPhone>(parsePhoneNumber(user.phone_number)),
    oldPasswordInputRef = useRef<HTMLInputElement>(null);

  const MButton = useRef(m(Button));

  const [interaction, setInteraction] = useState(false);

  const dispatch = useAppDispatch();

  const [
    patchUpdateProfile,
    {
      data: updateData,
      error: updateError,
      isSuccess: updateSuccess,
      reset: updateReset
    },
  ] = useUpdateProfileMutation();

  const [
    postSendConfirmPasswordEmail,
    {
      error: confirmError,
      isLoading: confirmLoading,
      isSuccess: confirmSuccess,
      reset: confirmReset
    },
  ] = useSendConfirmPasswordEmailMutation();

  const { fetcher, useForm, handleSubmit } = useHandleUpdate(
      { ...user, ...parsedPhone },
      { patchUpdateProfile, postSendConfirmPasswordEmail },
      () => {
        updateReset();
        confirmReset();
      }
    ),
    { formRef, form, setError, setErrors } = useForm,
    fadeVariant = fadeInOut({ in: 0.3, out: 0.58 });

  const {
    worldData,
    selected,
    setSelected,
    getCountries,
    getRegions,
    loading
  } = useWorldData(setError, { country: user.country });

  const processing = form.processing || confirmLoading;

  useEffect(() => {
    setParsedPhone(parsePhoneNumber(user.phone_number));
  }, [user.phone_number]);

  useEffect(() => {
    if (interaction) oldPasswordInputRef.current!.value = "";
  }, [interaction]);

  return (
    <section aria-labelledby="hPersonal" className={s.personal}>
      <hgroup className={s.title}>
        <Icon aria-hidden="true" id="badge-38" scaleWithText />
        <h2 id="hPersonal">{localeEntry.title}</h2>
      </hgroup>

      <Form
        ref={formRef}
        fetcher={fetcher}
        onSubmit={handleSubmit}
        onClick={() => setInteraction(true)}
        formLoading={processing}
        resSuccessMsg={(updateSuccess && updateData.message) || (confirmSuccess && localeEntry.success)}
        resError={
          fetcher.data?.ERROR ||
          form.error.global ||
          (isFetchBaseQueryError(updateError) &&
            (updateError.data as any)?.ERROR &&
            ((updateError.data as any).name === "PASS_CONFIRM_STILL_PENDING"
              ? injectElementInText(
                  (updateError.data as any).ERROR,
                  null,
                  (text) => (
                    <Link asChild intent="primary" to="">
                      <Button onClick={() => handleRevokePasswordReset(dispatch)}>
                        {text}
                      </Button>
                    </Link>
                  ),
                  { localeMarker: true }
                )
              : (updateError.data as any).ERROR)) 
          || confirmError
        }
        clearErrors={() => setErrors({})}
        noBots
        provideLang
      >
        <Input
          label={localeEntry.general.form.user.email}
          intent="primary"
          size="lrg"
          id="email"
          name="email"
          type="email"
          defaultValue={user.email}
          error={form.error.email}
          disabled={processing}
          onInput={() => setError("email", "")}
        />
        <div role="group" className={s.phone}>
          <Select
            label={localeEntry.general.form.user.calling_code}
            intent="callingCode"
            size="lrg"
            id="calling_code"
            name="calling_code"
            defaultValue={parsedPhone.callingCode}
            error={form.error.calling_code}
            Loader={<Spinner intent="primary" size="sm" />}
            loaderTrigger={loading.countries}
            disabled={processing}
            onFocus={getCountries}
            onInput={() => setError("calling_code", "")}
          >
            {parsedPhone.callingCode && (
              <option value={parsedPhone.callingCode}>
                {parsedPhone.callingCode}
              </option>
            )}
            {typeof worldData.countries !== "string" &&
              worldData.countries?.length &&
              worldData.countries.map((country) => (
                <option key={country.name} value={country.callingCode}>
                  {country.abbr} {country.callingCode}
                </option>
              ))}
          </Select>
          <Input
            label={localeEntry.general.form.user.phone_number}
            intent="primary"
            size="lrg"
            id="phone_number"
            name="phone_number"
            type="tel"
            defaultValue={parsedPhone.number}
            error={form.error.phone_number}
            onInput={(e) => {
              setError("phone_number", "");
              formatPhoneNumber(e.target as HTMLInputElement);
            }}
            disabled={processing}
          />
        </div>

        <Input
          ref={oldPasswordInputRef}
          label={
            interaction
              ? localeEntry.oldPassword
              : localeEntry.general.form.user.password
          }
          intent="primary"
          size="lrg"
          id="old_password"
          name="old_password"
          type="password"
          defaultValue="**********"
          error={form.error.old_password}
          disabled={processing}
          Button="password"
          onInput={() => setError("old_password", "")}
        />
        {interaction && (
          <Input
            label={localeEntry.newPassword}
            intent="primary"
            size="lrg"
            id="new_password"
            name="new_password"
            type="password"
            error={form.error.new_password}
            disabled={processing}
            Button="password"
            onInput={() => setError("new_password", "")}
          />
        )}

        <Select
          label={localeEntry.general.form.user.country}
          intent="primary"
          size="lrg"
          id="country"
          name="country"
          defaultValue={user.country}
          error={form.error.country}
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
              country: (e.target as HTMLSelectElement).value,
            }));
          }}
        >
          {user.country && <option value={user.country}>{user.country}</option>}
          {typeof worldData.countries !== "string" &&
            worldData.countries?.length &&
            worldData.countries.map((country) => (
              <option key={country.name} value={country.name}>
                {country.name}
              </option>
            ))}
        </Select>
        <Select
          label={localeEntry.general.form.user.region}
          intent="primary"
          size="lrg"
          id="region"
          name="region"
          defaultValue={user.region}
          error={
            typeof selected.regions === "string" ? selected.regions : undefined
          }
          Loader={<Spinner intent="primary" size="sm" />}
          loaderTrigger={loading.regions}
          disabled={processing || !selected.country}
          onFocus={getRegions}
        >
          {selected.regions.length &&
            typeof selected.regions !== "string" &&
            selected.regions.map((region) => (
              <option
                key={region.name}
                value={region.name}
                {...(region.name === user.region && { selected: true })}
              >
                {region.name}
              </option>
            ))}
        </Select>

        {interaction && (
          <MButton.current
            {...(!user.locked && { "aria-live": "polite" })}
            variants={fadeVariant}
            initial="hidden"
            animate="visible"
            intent="primary"
            size="xl"
            type="submit"
            disabled={processing || user.locked === "attempts"}
          >
            {processing ? (
              <Spinner intent="primary" size="md" />
            ) : (
              localeEntry.general.update
            )}
          </MButton.current>
        )}
      </Form>
    </section>
  );
}
