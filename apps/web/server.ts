/**
 * Server Side Rendering Server
 *
 * Description:
 * Dynamic Site Generation for pages, loads initial redux state, redirects, etc.
 */

import type { Request as ERequest, Response as EResponse } from "express";
import type { ViteDevServer } from "vite"; 
import type { LocaleMeta } from "@typings/Locale";
import type { AuthState } from "@authFeat/redux/authSlice";

import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import morgan from "morgan";
import sirv from "sirv";
import rateLimit from "express-rate-limit";
import { hashSync } from "bcryptjs";

import TITLE_PREFIX from "@constants/TITLE_PREFIX";

import { logger } from "@qc/utils";
import parsePathWithLocale from "@utils/parsePathWithLocale";

import { configureStore, nanoid } from "@reduxjs/toolkit";
import { slicesReducer } from "@redux/reducers/slices";

const { PROTOCOL, HOST, PORT: ENV_PORT } = process.env,
  PORT = Number(ENV_PORT) || 3000;

const _dirname = dirname(fileURLToPath(import.meta.url));

const defaultKeywords = [
  "blackjack",
  "bonuses",
  "casino",
  "chat",
  "community",
  "friends",
  "fair casino",
  "gamble",
  "gambling",
  "games",
  "player trust",
  "quests",
  "responsible gambling",
  "secure gaming",
  "social"
].join(", ");

async function setupServer() {
  const app = express();
  let vite: ViteDevServer | undefined;

  app.set("trust proxy", 1);

  if (process.env.NODE_ENV === "development") {
    const { createServer } = await import("vite");
    vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom"
    });

    app.use(vite.middlewares);
    app.use(morgan("dev"));
  } else {
    app.use(sirv(join(_dirname, "public"), { gzip: true }));
    app.use(morgan("combined"));
  }

  // limits repeated requests (spam bots).
  app.use(
    rateLimit({
      windowMs: 10 * 1000, // 10 seconds
      max: 5, // limits each IP to 5 requests per windowMs.
      handler: (_: ERequest, res: EResponse) => 
        res.status(429).send(
          "Too many requests made from this IP, please try again later."
        )
    })
  );

  app.use((req, res, next) => {
    if (req.method !== "GET") {
      // Must be a get request.
      return res.status(403).send("Access Denied");
    } else if (!req.accepts("html")) {
      // Must accept html.
      return res.status(406).send("Not Acceptable");
    }

    next();
  });

  app.use((req, res, next) => {
    const parts = parsePathWithLocale(req.path);
    req.locale = "en"

    if (!parts && !Object.values(req.query).length) {
      req.restPath = req.path === "/" ? "/about" : req.path;
      return res.redirect(301, `/${req.locale}${req.restPath}`);
    } 
    if (parts) {
      req.locale = parts[1];
      req.restPath = parts[2];
    }

    if (!req.restPath || req.restPath === "/") {
      req.restPath = "/about";
      return res.redirect(
        301,
        `/${req.locale}/about${
          Object.values(req.query).length
            ? `?${new URLSearchParams(req.query as Record<string, any>).toString()}`
            : ""
        }`
      );
    }

    next();
  });

  app.get("/*", async (req, res, next) => {
    try {
      let render, template;

      if (process.env.NODE_ENV === "development") {
        const [entry, indexHTML] = await Promise.all([
          vite!.ssrLoadModule("./src/entry-server.tsx"), // Makes it compatible with vite ssr in dev and hmr, etc.
          vite!.transformIndexHtml(req.originalUrl, readFileSync("index.html", "utf-8"))
        ]);
        render = entry.render;
        template = indexHTML;
      } else {
        const [entry, indexHTML] = await Promise.all([
          import("./src/entry-server"),
          readFile(join(_dirname, "./public/index.html"), "utf-8")
        ]);
        render = entry.render;
        template = indexHTML;
      }
      // console.log("template", template);
      // console.log("render", render);

      const localeData = await readFile(
        join(_dirname, `./src/locales/${req.locale}.json`),
        "utf-8"
      );

      const parsedLocaleData: any = JSON.parse(localeData),
        pageMeta: LocaleMeta = (
          parsedLocaleData.page[req.restPath] || parsedLocaleData.page["/error-404-page"]
        ).meta;

      try {
        const { preloadedStateScript, store } = getInitialReduxState();

        const appHtml = await render(req, res, store, {
            type: req.locale,
            data: parsedLocaleData
          }),
          html = template
            .replace(`<html lang="">`, `<html lang="${req.locale}">`)
            .replace(
              "<!--meta-->",
              pageMeta.tags.map(
                (tag) => `<meta name="${tag.name}" content="${tag.content}, ${defaultKeywords}">`
              ).join("\n\t")
            )
            .replace("<!--title-->", `${pageMeta.title} ${TITLE_PREFIX}`)
            .replace("<!--ssr-outlet-->", appHtml)
            .replace(
              "<!--init-locale-content-->",
              // TODO:
              // `<script>window.__LOCALE_DATA__ = ${JSON.stringify(JSON.parse(localeData))};</script>`
              // `<script>window.__LOCALE_DATA__ = ${localeData.replace(/\s+/g, " ")};</script>`
              `<script>window.__LOCALE_DATA__ = ${localeData.replace(/</g, "\\u003c")};</script>`
            )
            .replace("<!--init-state-->", preloadedStateScript);

        return res.status(200).send(html);
      } catch (error: any) {
        if (redirect(res, error) === false) throw error;
      }
    } catch (error: any) {
      process.env.NODE_ENV === "development" && vite!.ssrFixStacktrace(error);
      next(error);
    }
  });

  return app;
}

function redirect(res: EResponse, error: any) {
  if ("statusCode" in error && "location" in error) {
    if (error.statusCode === 404) return res.redirect(301, "/error-404-page");
  } else if (
    error instanceof Response &&
    error.status >= 300 &&
    error.status <= 399
  ) {
    return res.redirect(
      error.status,
      error.headers.get("Location") || ""
    );
  }

  return false;
}

/**
 * Preloads the initial redux state for the client and also generates the initial oState token for the google login.
 */
function getInitialReduxState() {
  const store = configureStore({ reducer: slicesReducer }),
    oStateToken = nanoid();

  const initialAuthState: AuthState = {
    user: {
      credentials: null,
      token: {
        oState: { original: oStateToken, secret: hashSync(oStateToken, 6) },
        csrf: null
      }
    }
  };

  const preloadedStateScript = `<script>window.__PRELOADED_STATE__ = ${JSON.stringify(
    {
      ...store.getState(),
      auth: initialAuthState
    }
  ).replace(/</g, "\\u003c")};</script>`;

  return { preloadedStateScript, store };
}

setupServer().then((app) =>
  app.listen(PORT, HOST!, () =>
    logger.info(
      `Server is running on ${PROTOCOL}${HOST}:${PORT}; Ctrl-C to terminate...`
    )
  )
);
