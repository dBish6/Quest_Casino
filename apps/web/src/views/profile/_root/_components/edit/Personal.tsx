import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import { useRef, useState, useEffect } from "react";
import { m } from "framer-motion"

import { fadeInOut } from "@utils/animations";
import formatPhoneNumber from "@authFeat/utils/formatPhoneNumber";
import parseMessageWithLink from "@authFeat/utils/parseMessageWithLink";

import { useHandleUpdate } from "../../_hooks/useHandleUpdate";
import useWorldData from "@authFeat/hooks/useWorldData";

import { useAppDispatch } from "@redux/hooks";

import { useUpdateProfileMutation, useSendConfirmPasswordEmailMutation } from "@authFeat/services/authApi";

import { Icon } from "@components/common";
import { Form } from "@components/form";
import { Button, Input, Select } from "@components/common/controls";
import { Spinner } from "@components/loaders";

import s from "../../profile.module.css";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";
import handleRevokePasswordReset from "@authFeat/services/handleRevokePasswordReset";

export interface ParsedPhone {
  callingCode?: string;
  number?: string
}

interface ProfilePersonalProps {
  user: UserProfileCredentials;
}

function parsePhoneNumber(phoneNumber: string | undefined) {
  if (!phoneNumber) return {};
  const [callingCode, ...rest] = phoneNumber.split(" ");
  return { callingCode, number: rest.join(" ") };
};

export default function Personal({ user }: ProfilePersonalProps) {
  const [userEmail, setUserEmail] = useState(user.email),
    [parsedPhone, setParsedPhone] = useState<ParsedPhone>(parsePhoneNumber(user.phone_number)),
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
      { ...user, email: userEmail, ...parsedPhone },
      { patchUpdateProfile, postSendConfirmPasswordEmail },
      () => {
        updateReset();
        confirmReset();
      },
      (data) => {
        if (data.refreshed) setUserEmail(data.user.email);
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
  }, [user.phone_number])

  useEffect(() => {
    if (interaction) oldPasswordInputRef.current!.value = "";
  }, [interaction])
  
  return (
    <section aria-labelledby="hPersonal" className={s.personal}>
      <hgroup className={s.title}>
        <Icon aria-hidden="true" id="badge-38" scaleWithText />
        <h2 id="hPersonal">Personal Information</h2>
      </hgroup>

      <Form
        ref={formRef}
        fetcher={fetcher}
        onSubmit={handleSubmit}
        onClick={() => setInteraction(true)}
        formLoading={processing}
        resSuccessMsg={(updateSuccess && updateData.message) || (confirmSuccess && "Profile successfully updated.")}
        resError={
          fetcher.data?.ERROR || form.error.global ||
          (isFetchBaseQueryError(updateError) &&
            (updateError.data as any)?.ERROR &&
            parseMessageWithLink(
              (updateError.data as any).ERROR,
              (updateError.data as any).ERROR.includes("cancel password reset") && 
              {
                sequence: "cancel password reset",
                options: { onClick: () => handleRevokePasswordReset(dispatch), button: true }
              }
            )) 
            || confirmError
        }
        clearErrors={() => setErrors({})}
        noBots
      >
        <Input
          label="Email"
          intent="primary"
          size="lrg"
          id="email"
          name="email"
          type="email"
          defaultValue={userEmail}
          error={form.error.email}
          disabled={processing}
          onInput={() => setError("email", "")}
        />
        <div role="group" className={s.phone}>
          <Select
            label="Code"
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
            label="Phone Number"
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
          label={interaction ? "Old Password" : "Password"}
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
            label="New Password"
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
          label="Country"
          intent="primary"
          size="lrg"
          id="country"
          name="country"
          defaultValue={user.country}
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
          label="Region"
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
            aria-label="Update"
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
              "Update"
            )}
          </MButton.current>
        )}
      </Form>
    </section>
  );
}