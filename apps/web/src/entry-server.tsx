import type { Request as ERequest, Response as EResponse } from "express";
import type { Store } from "@reduxjs/toolkit";
import type { LocaleData } from "@typings/Locale";

import { renderToString } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router-dom/server";

import { Provider as ReduxProvider } from "react-redux";

import { routes } from "./routes";

export async function render(
  req: ERequest,
  res: EResponse,
  store: Store,
  locale: { type: string; data: LocaleData }
) {
  const { query, dataRoutes } = createStaticHandler(routes(locale)),
    request = createFetchRequest(req, res),
    context = await query(request);

  if (
    context instanceof Response ||
    context.statusCode === 404 && context.location.pathname !== "/home" ||
    context.location.pathname === "/"
  ) {
    throw context;
  }

  const router = createStaticRouter(dataRoutes, context);
  return renderToString(
    <ReduxProvider store={store}>
      <StaticRouterProvider
        router={router}
        context={context}
        nonce="the-nonce"
      />
    </ReduxProvider>
  );
}

function createFetchRequest(req: ERequest, res: EResponse) {
  const origin = `${req.protocol}://${req.get("host")}`,
    url = new URL(req.originalUrl || req.url, origin),
    controller = new AbortController();

  res.on("close", () => controller.abort());

  const headers = new Headers();
  for (let [key, values] of Object.entries(req.headers)) {
    if (values) {
      if (Array.isArray(values)) {
        for (let value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return new Request(url.href, {
    method: req.method,
    headers,
    ...(req.method !== "GET" && req.method !== "HEAD" && { body: req.body }),
    signal: controller.signal
  });
}
