import type { UserProfileCredentials } from "@qc/typescript/typings/UserCredentials";
import type { ParsedPhone } from "../_components/edit/Personal";
import type { UpdateProfileBodyDto } from "@qc/typescript/dtos/UpdateUserDto";
import type { MutationResponse } from "@authFeat/hooks/useHandleUserValidationResponse";

import { useRef, useState } from "react";
import { useFetcher } from "react-router-dom";

import useLocale from "@hooks/useLocale";
import useForm from "@hooks/useForm";
import useHandleUserValidationResponse from "@authFeat/hooks/useHandleUserValidationResponse";

import { useAppDispatch } from "@redux/hooks";
import { ADD_TOAST } from "@redux/toast/toastSlice";

// FIXME: onlyPassword is handled horribly.
export function useHandleUpdate(
  user: Partial<UserProfileCredentials & ParsedPhone>,
  mutationTrigger: { patchUpdateProfile: any; postSendConfirmPasswordEmail?: any },
  updateReset: () => void,
  onSuccess?: (data: NonNullable<MutationResponse["data"]>) => void
) {
  const { content } = useLocale("useHandleUpdate");

  const fetcher = useFetcher(),
    form = useForm<
      UpdateProfileBodyDto & { calling_code: string } & {
        old_password: string;
        new_password: string;
      }
    >(),
    password = useRef<{ old_password?: string; new_password?: string } | null>(null);
  const [onlyPassword, setOnlyPassword] = useState<true | undefined>();

  const dispatch = useAppDispatch();

  const handlePassword = async (password: { old?: string; new?: string }) => {
    mutationTrigger.postSendConfirmPasswordEmail({ password })
      .then((res: MutationResponse) => {
        if (res.data?.success) form.formRef.current!.reset();
      })
      .finally(() => form.setLoading(false));
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user.email_verified)
      return form.setError("global", content.verify);

    form.setLoading(true);
    form.setError("global", "");
    password.current = null
    updateReset();

    const fields = e.currentTarget.querySelectorAll<HTMLInputElement>("input, textarea, select");
    let formData = new FormData();

    for (const field of fields) {
      const key = field.name, value = field.value;

      if (key === "bot") {
        formData.append(key, value);
        continue;
      } else if (["old_password", "new_password"].includes(key)) {
        password.current = { ...(password.current || {}), [key]: value };
        continue;
      }
      let credential;

      if (["first_name", "last_name"].includes(key)) credential = user.legal_name![key.split("_")[0]! as keyof typeof user["legal_name"]];
      else if (key === "calling_code") credential = user.callingCode;
      else if (key === "phone_number") credential = user.number;
      else credential = user[key as keyof typeof user];

      if (value.length && value !== credential) {
        if (["calling_code", "phone_number"].includes(key)) {
          formData.append("calling_code", fields[1].value);
          formData.append("phone_number", fields[2].value);
        } else {
          formData.append(key, value);
        }
      }
    }

    if (password.current?.old_password || password.current?.new_password) {
      Object.entries(password.current).forEach(([key, value]) => formData.append(key, value));
      if (Array.from(formData.keys()).length === 4) setOnlyPassword(true);
    }

    const formDataLength = Array.from(formData.keys()).filter((key) => key !== "lang").length;
    if (formDataLength <= 1) {
      form.setError("global", content.nothingChanged);
      form.setLoading(false);
    } else {
      formData.append("isProfile", "true");
      fetcher.submit(formData, {
        method: "post",
        action: "/action/user/validate"
      });
    }
  };

  useHandleUserValidationResponse(
    fetcher,
    {
      setErrors: form.setErrors,
      setLoading: form.setLoading
    },
    mutationTrigger.patchUpdateProfile,
    {
      success: (data, meta) => {
        if (onSuccess) onSuccess(data);
        
        if (password.current?.old_password && password.current?.new_password) {
          if (meta.request.body.email) {
            dispatch(
              ADD_TOAST({
                title: content.conflictTitle,
                message: content.conflict,
                intent: "error"
              })
            );
          } else {
            dispatch(
              ADD_TOAST({
                title: content.passwordTitle,
                message: onlyPassword ? content.password : content.passwordAlso,
                intent: "info",
                duration: 6500
              })
            );
            const { old_password, new_password } = password.current;
            handlePassword({ old: old_password!, new: new_password! });
          }
        }
      },
      error: (error) => {
        if (error.status === 429) form.setError("global", error.data!.ERROR);
      },
    },
    { extraBody: { password: undefined, profileOnlyPassword: onlyPassword } }
  );

  return { fetcher, useForm: form, handleSubmit };
}
