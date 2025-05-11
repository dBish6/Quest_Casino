import type { LoginBodyDto } from "@qc/typescript/dtos/LoginBodyDto";
import type NullablePartial from "@qc/typescript/typings/NullablePartial";

import { useEffect, useState } from "react";
import { Title } from "@radix-ui/react-dialog";

import useLocale from "@hooks/useLocale";
import useForm from "@hooks/useForm";
import useSwitchModal from "@authFeat/hooks/useSwitchModal";
import { useLoginMutation, useLoginGoogleMutation } from "@authFeat/services/authApi";

import { ModalTemplate, ModalTrigger } from "@components/modals";
import { Form } from "@components/form";
import { Button, Input } from "@components/common/controls";
import { Icon } from "@components/common";
import { LoginWithGoogle } from "@authFeat/components/loginWithGoogle";
import { Spinner } from "@components/loaders";

import s from "./loginModal.module.css";
import injectElementInText from "@utils/injectElementInText";

export default function LoginModal() {
  const { content } = useLocale("LoginModal");

  const { form, setLoading, setError, setErrors } = useForm<LoginBodyDto>();

  const { handleSwitch } = useSwitchModal("login");

  const [
    postLogin,
    {
      error: loginError,
      isLoading: loginLoading,
      isSuccess: loginSuccess
    },
  ] = useLoginMutation();

  const [googleLoading, setGoogleLoading] = useState(false),
    [
      postLoginGoogle,
      {
        error: loginGoogleError,
        isLoading: loginGoogleLoading,
        isSuccess: loginGoogleSuccess
      },
    ] = useLoginGoogleMutation();

  const processingForm = loginLoading || form.processing,
    processing = processingForm || loginGoogleLoading || googleLoading;

  useEffect(() => {
    if (loginSuccess || loginGoogleSuccess)
      (document.querySelector(".exitXl") as HTMLButtonElement).click();
  }, [loginSuccess, loginGoogleSuccess]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget as HTMLFormElement,
      fields = form.querySelectorAll<HTMLInputElement>("input");

    try {
      let reqBody: NullablePartial<LoginBodyDto> = {} as any;
      for (const field of fields) {
        if (field.type === "hidden") {
          if (field.value.length) (document.querySelector(".exitXl") as HTMLButtonElement).click();
          continue;
        }
        const key = field.name as keyof LoginBodyDto;

        if (!field.value.length) {
          setError(
            key,
            `${field.previousSibling!.textContent} ${content.general.form.user.error.required}`
          );
          continue;
        }
        reqBody[key] = field.value || null;
      }

      if (Object.keys(reqBody).length === 2) {
        const res = await postLogin(reqBody as LoginBodyDto);
        if (res.data?.message?.endsWith("successfully.")) form.reset();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey="login"
      width="368px"
      className={s.modal}
      onCloseAutoFocus={() => setErrors({})}
    >
      {() => (
        <>
          <hgroup className="head">
            <Icon aria-hidden="true" id="enter-45" />
            <Title asChild>
              <h2>{content.title}</h2>
            </Title>
          </hgroup>

          <Form
            onSubmit={handleSubmit}
            formLoading={processingForm}
            resError={(loginError || loginGoogleError) as any}
            noBots
          >
            <div className="inputs">
              <Input
                label={content.general.form.user.email}
                intent="primary"
                size="lrg"
                id="email"
                name="email"
                required
                error={form.error.email}
                disabled={processing}
                onInput={() => setError("email", "")}
              />
              <Input
                label={content.general.form.user.password}
                intent="primary"
                size="lrg"
                id="password"
                name="password"
                type="password"
                required
                error={form.error.password}
                disabled={processing}
                Button="password"
                onInput={() => setError("password", "")}
              />
            </div>
            <div className={s.forgot}>
              <ModalTrigger
                query={{ param: "forgot" }}
                intent="primary"
                onClick={(e) => handleSwitch(e)}
              >
                {content.forgot}
              </ModalTrigger>
            </div>

            <Button
              aria-live="polite"
              intent="primary"
              size="xl"
              type="submit"
              className="formBtn"
              disabled={processing}
            >
              {processingForm ? (
                <Spinner intent="primary" size="md" />
              ) : (
                content.submitBtn
              )}
            </Button>
          </Form>

          <LoginWithGoogle
            queryKey="login"
            postLoginGoogle={postLoginGoogle}
            setGoogleLoading={setGoogleLoading}
            processing={{
              google: googleLoading,
              form: processingForm,
              all: processing
            }}
          />

          <span className={s.haveAcc}>
            {injectElementInText(
              content.noAccount,
              null,
              (text) => (
                <ModalTrigger
                query={{ param: "register" }}
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

LoginModal.restricted = "loggedIn";
