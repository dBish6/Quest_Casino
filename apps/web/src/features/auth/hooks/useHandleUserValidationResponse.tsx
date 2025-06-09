import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetcherWithComponents } from "react-router-dom";
import type { FormState } from "@hooks/useForm";
import type { HttpResponse } from "@typings/ApiResponse";

import { useEffect } from "react";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

// I can't believe RTK Query don't export most their types.
export type MutationResponse = {
  data: HttpResponse<Record<string, any>>
  error?: undefined;
} | {
  data?: undefined;
  error: FetchBaseQueryError | SerializedError;
}

export default function useHandleUserValidationResponse(
  fetcher: FetcherWithComponents<any>,
  form: {
    formRef?: React.RefObject<HTMLFormElement>;
    setLoading: (bool: boolean) => void;
    setErrors: (errors: FormState["error"]) => void;
  },
  mutationTrigger: any,
  on: {
    success?: (
      data: HttpResponse<Record<string, any>>,
      meta: { request: { body: Record<string, any> } }
    ) => void;
    error?: (error: FetchBaseQueryError) => void;
  } = {},
  options: { extraBody?: Record<string, any> } = {}
) {
  useEffect(() => {
    const data = fetcher.data;

    const handleValidationResponse = async () => {
      try {
        if (data.errors) {
          if (data.errors.bot) (document.querySelector(".exitXl") as HTMLButtonElement)?.click();
          form.setErrors(data.errors);
        } else if (data.reqBody && !data.reqBody.avatar_url) {
          const body = { ...data.reqBody, ...options.extraBody };
          if (body.profileOnlyPassword) {
            if (on.success) on.success({} as any, { request: { body } });
            return;
          }

          const mutation = mutationTrigger(body);
          await mutation.then((res: MutationResponse) => {
            if (res.data?.success) {
              if (form.formRef) form.formRef.current!.reset();
              if (on.success) on.success(res.data, { request: { body } });
            } else if (isFetchBaseQueryError(res.error)) {
              if (on.error) on.error(res.error);
            }
          });

          return () => mutation.abort();
        }
      } finally {
        form.setLoading(false);
      }
    };
    
    if (data) handleValidationResponse();
  }, [fetcher.data]);
}
