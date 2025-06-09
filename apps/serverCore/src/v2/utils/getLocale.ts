import type { Request } from "express";
import type { Socket } from "socket.io";

import { LANGUAGES } from "@qc/constants";

import { logger } from "@qc/utils";
import { ApiError } from "./handleError";
import LocaleProvider from "./LocaleProvider";

export default async function getLocale(
  locale = "",
  reqOrSocket: Request | Socket
) {
  if (reqOrSocket.locale?.type !== locale) {
    reqOrSocket.locale = await LocaleProvider.init(locale);

    if (!LANGUAGES[locale as keyof typeof LANGUAGES]) 
      throw new ApiError(`"${locale}" is an unsupported locale.`);

    logger.debug(
      `${(reqOrSocket as any).request ? "Socket" : "HTTP"} ${reqOrSocket.locale.type} LocaleProvider initialized.`
    );
  }
}
