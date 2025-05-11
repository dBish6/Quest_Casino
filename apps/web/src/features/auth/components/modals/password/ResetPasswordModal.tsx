import { useSearchParams, useFetcher } from "react-router-dom";
import { Title } from "@radix-ui/react-dialog";

import useLocale from "@hooks/useLocale";
import useForm from "@hooks/useForm";
import useSwitchModal from "@authFeat/hooks/useSwitchModal";
import useHandleUserValidationResponse from "@authFeat/hooks/useHandleUserValidationResponse";

import { useSendConfirmPasswordEmailMutation } from "@authFeat/services/authApi";

import { verTokenRequiredView } from "@views/index";
import { ModalTemplate, ModalTrigger } from "@components/modals";
import { Form } from "@components/form";
import { Button, Input } from "@components/common/controls";
import { Spinner } from "@components/loaders";

import s from "./passwordModal.module.css";

interface FormFields {
  password: string;
  con_password: string;
}

function ResetPasswordModal() {
  const [searchParams] = useSearchParams();

  const { content } = useLocale("ResetPasswordModal");

  const fetcher = useFetcher(),
    { formRef, form, setLoading, setError, setErrors } = useForm<FormFields>();

  const { handleSwitch } = useSwitchModal("reset");

  const [
    postSendConfirmPasswordEmail,
    {
      data: confirmData,
      error: confirmError,
      isSuccess: confirmSuccess,
      reset: confirmReset
    },
  ] = useSendConfirmPasswordEmailMutation();

  useHandleUserValidationResponse(
    fetcher,
    { formRef, setLoading, setErrors },
    postSendConfirmPasswordEmail,
    {
      error: (error) => {
        if (
          [401, 403].includes(error.status as number) &&
          (error.data?.ERROR || "").includes("expired", -1)
        ) {
          setError(
            "global",
            (error.data?.ERROR || "").includes("missing", -1)
              ? content.form.error.tokenExpired
              : content.form.error.tokenExpired.replace(/{[^{}]*}/g, "")
          );
        } else if (error.status === 429) {
          setError("global", error.data!.ERROR);
        }
      }
    },
    { extraBody: { param: "forgot", verification_token: searchParams.get("reset") || "" } }
  );

  return (
    <ModalTemplate
      aria-description={content.aria.descrip.modal}
      queryKey="reset"
      width="368px"
      className={s.modal}
      onCloseAutoFocus={() => {
        setErrors({});
        confirmReset();
      }}
    >
      {() => (
        <>
          <Title asChild>
            <h2 className="head">{content.title}</h2>
          </Title>

          <Form
            ref={formRef}
            fetcher={fetcher}
            method="post"
            action="/action/user/validate"
            onSubmit={() => {
              setLoading(true);
              setError("global", "");
              confirmReset();
            }}
            formLoading={form.processing}
            resSuccessMsg={confirmSuccess && confirmData.message}
            resError={form.error.global || confirmError}
            clearErrors={() => setErrors({})}
            noBots
          >
            <div className="inputs">
              <Input
                label={content.general.form.user.password}
                intent="primary"
                size="lrg"
                id="password"
                name="password"
                type="password"
                required
                error={form.error.password}
                disabled={form.processing}
                onInput={() => setError("password", "")}
              />
              <Input
                label={content.general.form.user.con_password}
                intent="primary"
                size="lrg"
                id="con_password"
                name="con_password"
                type="password"
                required
                error={form.error.con_password}
                disabled={form.processing}
                onInput={() => setError("con_password", "")}
              />
            </div>
            <Button
              {...(!form.processing && {
                "aria-label": content.aria.label.submitBtn
              })}
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

ResetPasswordModal.restricted = "loggedIn";

export default verTokenRequiredView(ResetPasswordModal, "reset");