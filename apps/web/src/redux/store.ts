import type { StateUser } from "@authFeat/redux/authSlice";
import type { ChatState } from "@chatFeat/redux/chatSlice";

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { throttle } from "tiny-throttle";

import { deepMerge } from "@utils/deepMerge";

import { rootReducer } from "./reducers";

import { loadState, saveState } from "./persist";
import { apiErrorHandler } from "@services/apiErrorHandler";
import { apiMiddleware } from "@services/api";

let preloadedState = {};
if (typeof window !== "undefined") {
  preloadedState = deepMerge([(window.__PRELOADED_STATE__ || {}), loadState()])
  delete window.__PRELOADED_STATE__;
}

const store = configureStore({
  reducer: rootReducer,
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ["meta.baseQueryMeta.request", "meta.baseQueryMeta.response", "meta.arg.originalArgs.callback", "payload.callback", "payload.options.button.onClick"]
      }
    }).concat(apiErrorHandler, apiMiddleware)
});

store.subscribe(
  throttle(() => {
    const state = store.getState(),
      user = state.auth.user;

    const targetPersistAuth: StateUser = {
      ...user,
      token: {
        csrf: user.token.csrf,
        ...(user.token.oState ? { oState: user.token.oState } : {})
      }
    };

    const targetPersistChat: Partial<ChatState> = {
      restriction: state.chat.restriction
    };

    const persisted = {
      auth: { user: targetPersistAuth },
      chat: targetPersistChat
    };
    saveState(persisted);
  }, 1000)
);

setupListeners(store.dispatch);

export default store;
export type RootStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
