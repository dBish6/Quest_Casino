import { useFetcher } from "react-router-dom";
import { Title } from "@radix-ui/react-dialog";

import useLocale from "@hooks/useLocale";
import useForm from "@hooks/useForm";
import useSwitchModal from "@authFeat/hooks/useSwitchModal";
import useHandleUserValidationResponse from "@authFeat/hooks/useHandleUserValidationResponse";

import { useSendForgotPasswordEmailMutation } from "@authFeat/services/authApi";

import { ModalTemplate, ModalTrigger } from "@components/modals";
import { Form } from "@components/form";
import { Button, Input } from "@components/common/controls";
import { Spinner } from "@components/loaders";

import s from "./passwordModal.module.css";

export default function ForgotPasswordModal() {
  const { content } = useLocale("ForgotPasswordModal");

  const fetcher = useFetcher(),
    { formRef, form, setLoading, setError, setErrors } = useForm<{ email: string }>();

  const { handleSwitch } = useSwitchModal("forgot");

  const [
    postSendForgotPasswordEmail,
    {
      data: forgotData,
      error: forgotError,
      isSuccess: forgotSuccess,
      reset: forgotReset
    },
  ] = useSendForgotPasswordEmailMutation();

  useHandleUserValidationResponse(fetcher, { formRef, setLoading, setErrors }, postSendForgotPasswordEmail);

  return (
    <ModalTemplate
      aria-describedby="reTxt"
      queryKey="forgot"
      width="368px"
      className={s.modal}
      onCloseAutoFocus={() => {
        setErrors({});
        forgotReset();
      }}
    >
      {() => (
        <>
          <Title asChild>
            <h2 aria-label={content.aria.title}>{content.title}</h2>
          </Title>
          <p id="reTxt">{content.para}</p>

          <Form
            ref={formRef}
            fetcher={fetcher}
            method="post"
            action="/action/user/validate"
            onSubmit={() => {
              setLoading(true);
              if (forgotSuccess) forgotReset();
            }}
            formLoading={form.processing}
            resSuccessMsg={forgotSuccess && forgotData.message}
            resError={forgotError}
            clearErrors={() => setErrors({})}
            noBots
          >
            <div className="inputs">
              <Input
                label={content.general.form.user.email}
                intent="primary"
                size="lrg"
                id="email"
                name="email"
                type="email"
                required
                error={form.error.email}
                disabled={form.processing}
                onInput={() => setError("email", "")}
              />
            </div>
            <Button
              aria-label={content.aria.label.submitBtn}
              aria-live="polite"
              intent="primary"
              size="xl"
              type="submit"
              className="formBtn"
              disabled={form.processing}
            >
              {form.processing ? (
                <Spinner intent="primary" size="md" />
              ) : (
                content.general.submit
              )}
            </Button>
          </Form>

          <div className={s.back}>
            <ModalTrigger
              query={{ param: "login" }}
              intent="primary"
              onClick={(e) => handleSwitch(e)}
            >
              {content.back}
            </ModalTrigger>
          </div>
        </>
      )}
    </ModalTemplate>
  );
}

ForgotPasswordModal.restricted = "loggedIn";
