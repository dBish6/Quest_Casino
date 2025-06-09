/**
 * Api Entry File
 *
 * Description:
 * Setup for HTTP requests and responses.
 */

import type { CorsOptions } from "cors";
import express from "express";

import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";

import morgan from "morgan";

import httpGetLocale from "@middleware/httpGetLocale";
import httpErrorHandler from "@middleware/httpErrorHandler";

import authRouter from "@authFeatHttp/routes/authRoute";
// import chatRouter from "@chatFeatHttp/routes/chatRoute";
import gameRouter from "@gameFeatHttp/routes/gameRoute"
import paymentRouter from "@paymentFeatHttp/routes/paymentRoute"


export default function initializeHttp(corsOptions: CorsOptions) {
  const app = express(),
    baseUrl = "/api/v2";

  app.disable("x-powered-by"); // Can reduce the ability of attackers to determine the software that a server uses.
  app.set("trust proxy", 1);

  // *Parser Middleware*
  app.use(bodyParser.urlencoded({ extended: true, limit: "750kb" }));
  app.use(bodyParser.json({ limit: "750kb" }));
  app.use(cookieParser());

  // *Security Middleware*
  app.use(cors(corsOptions)); // Enables CORS with the specified options.
  app.use(helmet()); // Sets various HTTP headers that can help defend against common web hacks.
  app.use(hpp()); // Protects against HTTP Parameter Pollution attacks.
  // Rate-limiting; used to limit repeated requests.
  app.use(
    rateLimit({
      windowMs: 60 * 60 * 1000, // 60 minutes.
      max: 55, // limits each IP to 55 requests per windowMs.
      handler: (_: express.Request, res: express.Response) => 
        res.status(429).json({
          status: 429,
          ERROR: "Too many requests made from this IP, please try again after an hour."
        })
    })
  );

  // *Logger Middleware*
  app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
  // *Locale Middleware*
  app.use(httpGetLocale);

  // *Routers*
  app.use(`${baseUrl}/auth`, authRouter);
  // app.use(`${baseUrl}/chat`, chatRouter);
  app.use(`${baseUrl}/`, gameRouter);
  app.use(`${baseUrl}/payment`, paymentRouter);

  // Test entry route.
  app.get(`${baseUrl}/`, async (_, res) => {
    res.json({ message: "Quest Casino api online!" });
  });

  // *Error Handling Middleware*
  app.use(httpErrorHandler);

  return app;
};
