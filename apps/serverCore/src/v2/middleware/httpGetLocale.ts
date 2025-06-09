import type { Request, Response, NextFunction } from "express";

import { handleHttpError } from "@utils/handleError";
import getLocale from "@utils/getLocale";

/**
 * Initializes locale (language).
 * @middleware
 * @response `ApiError`.
 */
export default async function httpGetLocale(req: Request, _: Response, next: NextFunction) {
  try {
    const locale = req.headers["accept-language"];

    await getLocale(locale, req);
    next();
  } catch (error: any) {
    next(handleHttpError(error, "httpGetLocale middleware error."));
  }
}
