import type { ModalQueryKeyValues } from "@components/modals";

import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import { nanoid, createAction } from "@reduxjs/toolkit";

import injectElementInText from "@utils/injectElementInText";
import apiEntry from "@services/getLocaleEntry";

interface ToastInjectOption {
  sequence?: Parameters<typeof injectElementInText>[1];
  linkTo?: string | { param: ModalQueryKeyValues; };
  btnOnClick?: () => void;
  localeMarker?: NonNullable<Parameters<typeof injectElementInText>[3]>["localeMarker"];
}

export interface ToastOptions {
  inject?: ToastInjectOption
}

export interface ToastPayload {
  id?: string;
  title?: string;
  message: string;
  intent?: "error" | "success" | "info";
  duration?: number;
  options?: ToastOptions;
}

export interface ToastState {
  count: ToastPayload[];
}

const initialState: ToastState = {
  count: []
};

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    ADD_TOAST: (state, action: PayloadAction<ToastPayload>) => {
      state.count = [...state.count, { ...action.payload, id: nanoid() }];
    },
    REMOVE_TOAST: (state, action: PayloadAction<{ id: string }>) => {
      state.count = state.count.filter((toast) => toast.id !== action.payload.id);
    },
    CLEAR_TOASTS: (state) => {
      state.count = [];
    },
  },
});

export const { name: toastName, reducer: toastReducer } = toastSlice,
  { ADD_TOAST, REMOVE_TOAST, CLEAR_TOASTS } = toastSlice.actions;

export default toastSlice;

export const unexpectedErrorToast = createAction(
  ADD_TOAST.type,
  function (message?: string, askRefresh: boolean = true) {
    const localeApi = apiEntry();

    return {
      payload: {
        title: localeApi.unexpectedTitle,
        message: localeApi.error.unexpectedFull
          .replace("{{message}}", message ?? localeApi.error.unexpected)
          .replace("{{refresh}}", askRefresh ? localeApi.error.tryRefresh : ""),
        intent: "error",
        options: {
          inject: {
            linkTo: "/support",
            localeMarker: true
          }
        }
      }
    };
  }
);

export const authTokenExpiredToast = createAction(
  ADD_TOAST.type,
  function () {
    const localeApi = apiEntry();

    return {
      payload: {
        title: localeApi.sessionExpiredTitle,
        message: localeApi.error.sessionExpired,
        intent: "error",
        options: {
          inject: {
            linkTo: { param: "login" },
            localeMarker: true
          }
        }
      }
    };
  }
);
