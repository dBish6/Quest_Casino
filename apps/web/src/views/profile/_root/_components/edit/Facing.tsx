import type { LocaleEntry } from "@typings/Locale";
import type { UseLocale } from "@hooks/useLocale";
import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import { useEffect, useRef, useState } from "react";

import { useHandleUpdate } from "../../_hooks/useHandleUpdate";

import { useUpdateProfileMutation } from "@authFeat/services/authApi";

import { ScrollArea } from "@components/scrollArea";
import { Blob, Icon, Image } from "@components/common";
import { Button, Input } from "@components/common/controls";
import { Form } from "@components/form";
import { ModalTrigger } from "@components/modals";
import { Spinner } from "@components/loaders";

import s from "../../profile.module.css";

interface ProfileFacingProps {
  localeEntry: LocaleEntry;
  numberFormat: UseLocale["numberFormat"];
  user: UserProfileCredentials;
}

export default function Facing({ localeEntry, numberFormat, user }: ProfileFacingProps) {
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null),
    bioCounterRef = useRef<HTMLSpanElement>(null),
    [avatarUrl, setAvatarUrl] = useState("/images/default.svg");

  const formatter = useRef(numberFormat());

  const [editing, setEditing] = useState<{
    avatar?: boolean;
    username?: boolean;
    legalName?: boolean;
    bio?: boolean;
  }>({});

  const [
    patchUpdateProfile,
    {
      data: updateData,
      error: updateError,
      isSuccess: updateSuccess,
      reset: updateReset
    },
  ] = useUpdateProfileMutation();

  const { fetcher, useForm, handleSubmit } = useHandleUpdate(
      user,
      { patchUpdateProfile },
      updateReset
    ),
    { formRef, form, setLoading, setError, setErrors } = useForm,
    resSuccessMsg = updateSuccess && updateData.message,
    resError = fetcher.data?.ERROR || form.error.global || updateError;
    
  const AvatarForm = (editing.avatar ? Form : "div") as typeof Form,
    newAvatarUrl = fetcher.data?.reqBody?.avatar_url;

  const buttonDisabledProps = Object.freeze({
    ...(!user.locked && { "aria-live": "polite" }),
    disabled: form.processing || user.locked === "attempts"
  });

  const handleSetEditing = (key: keyof typeof editing) => {
    updateReset();
    setEditing({ [key]: true });
    setErrors({});
  };

  const handleBioCounter = (isInitial: boolean) => {
    const textarea = bioTextareaRef.current!,
      counter = bioCounterRef.current!,
      max = 338

    if (textarea.value.length >= max) {
      bioTextareaRef.current!.value = textarea.value.slice(0, max);
      if (!isInitial) {
        textarea.setAttribute("aria-invalid", "true");
        counter.setAttribute(
          "aria-label",
          `${formatter.current.format(max)} ${localeEntry.aria.label.charUsed}`
        );
        counter.setAttribute("aria-live", "assertive");
        counter.style.color = "var(--c-status-red)";
      }
    } else {
      textarea.removeAttribute("aria-invalid");
      counter.removeAttribute("aria-label");
      counter.removeAttribute("aria-live");
      counter.style.color = "var(--c-para)";
    }

    bioCounterRef.current!.innerText = `${formatter.current.format(
      bioTextareaRef.current!.value.length
    )}/${formatter.current.format(max)}`;
  };
  useEffect(() => {
    handleBioCounter(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        bioTextareaRef.current!.setAttribute("data-keyboard", "true");
        window.removeEventListener("keydown", handleKeyDown);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAvatar = Object.freeze({
    file: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleSetEditing("avatar");
        setErrors({});
  
        const formData = new FormData();
        formData.append(e.currentTarget.name, file);
        formData.append("isProfile", "true");
  
        fetcher.submit(formData, {
          method: "post",
          action: "/action/user/validate",
          encType: "multipart/form-data"
        });
      }
    },
    submit: () => {
      setLoading(true);
      patchUpdateProfile(fetcher.data.reqBody).finally(() => setLoading(false));
    },
    cancel: () => {
      setEditing({});
      setAvatarUrl(user.avatar_url || "/images/default.svg");
    }
  });

  useEffect(() => {
    if (newAvatarUrl) setAvatarUrl(newAvatarUrl);
  }, [newAvatarUrl]);

  useEffect(() => {
    if (user.avatar_url) setAvatarUrl(user.avatar_url);
  }, [user.avatar_url]);

  return (
    <section aria-label={localeEntry.aria.label.section} className={s.facing}>
      <Blob svgWidth={371.685} svgHeight={96.985}>
        <path
          data-name="Blob 5"
          d="M79.459.163c48.869.663 126.5-.592 192.186 0s87.3 29.082 98.04 50.572-23.818 24.2-55.068 35.389-69.644 6.582-69.644 6.582-47.347 1.6-108.7 0-74.198 14.752-107.785-7.617S-29.622-1.317 79.459.163Z"
          fill="rgba(178,67,178,0.4)"
        />
      </Blob>
      <ScrollArea orientation="vertical" className={s.inner}>
        <div className={s.picContainer}>
          <AvatarForm
            className={s.pic}
            {...(editing.avatar && {
              ref: formRef,
              fetcher: fetcher,
              action: "/action/user/validate", // We use this action programmatically, but it's still here as a safeguard if something somehow submits the form.
              formLoading: form.processing,
              resSuccessMsg,
              resError,
              clearErrors: () => setErrors({}),
              noBots: true
            })}
          >
            <Button
              aria-describedby="addPicTxt"
              title={localeEntry.aria.title.profilePic}
              type="button"
              className={s.avatar}
              onClick={(e) => (e.currentTarget.nextSibling?.nextSibling as HTMLInputElement).click()}
            >
              <Image
                src={avatarUrl}
                alt={localeEntry.aria.alt.profilePic}
                fill
              />
            </Button>
            <label
              id="addPicTxt"
              htmlFor="avatar_url"
              {...(newAvatarUrl && !updateSuccess && editing.avatar && {
                style: { position: "absolute", opacity: 0 }
              })}
            >
              {localeEntry.profilePic}
            </label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="file"
              style={{ position: "absolute", opacity: 0 }}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatar.file}
            />
            {newAvatarUrl && !updateSuccess && editing.avatar && (
              <div className={s.buttons}>
                <Button
                  aria-label={localeEntry.aria.label.cancel}
                  intent="secondary"
                  size="md"
                  type="button"
                  {...buttonDisabledProps}
                  onClick={handleAvatar.cancel}
                >
                  {localeEntry.cancel}
                </Button>
                <Button
                  intent="primary"
                  size="md"
                  type="button"
                  {...buttonDisabledProps}
                  onClick={handleAvatar.submit}
                >
                  {form.processing ? (
                    <Spinner intent="primary" size="sm" />
                  ) : (
                    localeEntry.upload
                  )}
                </Button>
              </div>
            )}
          </AvatarForm>
        </div>

        <div className={s.content}>
          {(editing.username || editing.legalName) && (
            <Button
              aria-label={localeEntry.aria.label.stopEdit}
              intent="exit ghost"
              size="md"
              onClick={() => setEditing({})}
            />
          )}
          <hgroup {...(!editing.username && { role: "group", "aria-roledescription": "heading group"})}>
            <div className={`${s.edit} ${s.username}`} data-editing={!!editing.username}>
              {!editing.username ? (
                <>
                  <h2 title={user.username}>{user.username}</h2>
                  <Button
                    aria-label={localeEntry.aria.label.editUsername}
                    iconBtn
                    onClick={() => handleSetEditing("username")}
                  >
                    <Icon aria-hidden="true" id="edit-26" scaleWithText />
                  </Button>
                </>
              ) : (
                <Form
                  ref={formRef}
                  fetcher={fetcher}
                  onSubmit={handleSubmit}
                  formLoading={form.processing}
                  resSuccessMsg={resSuccessMsg}
                  resError={resError}
                  clearErrors={() => setErrors({})}
                  noBots
                >
                  <Input
                    label={localeEntry.general.form.user.username}
                    intent="primary"
                    size="lrg"
                    id="username"
                    name="username"
                    defaultValue={user.username}
                    error={form.error.username}
                    disabled={form.processing}
                    Button={
                      <Button
                        aria-label={localeEntry.general.update}
                        intent="primary"
                        size="lrg"
                        type="submit"
                        iconBtn
                        {...buttonDisabledProps}
                      >
                        {form.processing ? (
                          <Spinner intent="primary" size="md" />
                        ) : (
                          <Icon id="check-mark-20" fill="var(--c-status-green)" scaleWithText />
                        )}
                      </Button>
                    }
                    onInput={() => setError("username", "")}
                  />
                </Form>
              )}
            </div>

            <div data-editing={!!editing.legalName}>
              <div className={`${s.edit} ${s.legalName}`} data-editing={!!editing.legalName}>
                {!editing.legalName ? (
                  <>
                    <p title={`${user.legal_name.first} ${user.legal_name.last}`} aria-roledescription="subtitle">
                      {user.legal_name.first} {user.legal_name.last}
                    </p>
                    <Image
                      src="https://flagcdn.com"
                      alt="Country Flag"
                      className={s.flag}
                    />
                    <Button
                      aria-label={localeEntry.aria.label.editName}
                      iconBtn
                      onClick={() => handleSetEditing("legalName")}
                    >
                      <Icon aria-hidden="true" id="edit-16" scaleWithText />
                    </Button>
                  </>
                ) : (
                  <Form
                    ref={formRef}
                    fetcher={fetcher}
                    onSubmit={handleSubmit}
                    formLoading={form.processing}
                    resSuccessMsg={resSuccessMsg}
                    resError={resError}
                    clearErrors={() => setErrors({})}
                    noBots
                  >
                    <Input
                      label={localeEntry.general.form.user.firstName}
                      intent="primary"
                      id="first_name"
                      name="first_name"
                      defaultValue={user.legal_name.first}
                      error={form.error.first_name}
                      disabled={form.processing}
                      onInput={() => setError("first_name", "")}
                    />
                    <Input
                      label={localeEntry.general.form.user.lastName}
                      intent="primary"
                      id="last_name"
                      name="last_name"
                      defaultValue={user.legal_name.last}
                      error={form.error.last_name}
                      disabled={form.processing}
                      onInput={() => setError("last_name", "")}
                    />
                    <Button
                      intent="primary"
                      size="lrg"
                      type="submit"
                      {...buttonDisabledProps}
                    >
                      {form.processing ? (
                        <Spinner intent="primary" size="md" />
                      ) : (
                        localeEntry.general.update
                      )}
                    </Button>
                  </Form>
                )}
              </div>
              {(!Object.values(editing).length || editing.bio) && (
                <ModalTrigger
                  query={{ param: "prof", value: encodeURIComponent(user.username) }}
                  buttonProps={{
                    intent: "primary",
                    size: "md"
                  }}
                  className={s.visitorView}
                >
                  {localeEntry.view}
                </ModalTrigger>
              )}
            </div>
          </hgroup>

          <div
            role="group"
            className={s.bio}
            onClick={() => {
              bioTextareaRef.current!.focus();
              handleSetEditing("bio");
            }}
          >
            <Form
              ref={formRef}
              fetcher={fetcher}
              onSubmit={handleSubmit}
              formLoading={form.processing}
              {...(editing.bio && {
                resSuccessMsg: resSuccessMsg,
                resError: resError
              })}
              resSuccessMsg={updateData?.user?.bio && resSuccessMsg}
              resError={resError}
              clearErrors={() => setErrors({})}
              noBots
            >
              <header>
                <h3 id="hEditBio" className="hUnderline">{localeEntry.editBio}</h3>
                {editing.bio && (
                  <Button
                    aria-label={localeEntry.general.update}
                    intent="ghost"
                    size="md"
                    type="submit"
                    iconBtn
                    {...buttonDisabledProps}
                  >
                    <Icon aria-hidden="true" id="check-mark-18" fill="var(--c-status-green)" />
                  </Button>
                )}
                <span ref={bioCounterRef} id="bioCount" className={s.charCount}>
                  {formatter.current.format(0)}/{formatter.current.format(338)}
                </span>
              </header>
              <Input
                ref={bioTextareaRef as any}
                aria-labelledby="hEditBio"
                aria-describedby="bioCount"
                label="Bio"
                id="bio"
                textarea
                name="bio"
                defaultValue={user.bio}
                onInput={() => handleBioCounter(false)}
                onFocus={() => handleSetEditing("bio")}
                onBlur={(e) => {
                  if (e.relatedTarget?.tagName === "BUTTON") return;
                  setEditing({});
                }}
              />
            </Form>
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
