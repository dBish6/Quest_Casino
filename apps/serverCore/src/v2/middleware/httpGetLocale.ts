import type { Request, Response, NextFunction } from "express";

import { handleHttpError } from "@utils/handleError";
import getLocale from "@utils/getLocale";

/**
 * Initializes locale (language).
 * @middleware
 * @response `ApiError`.
 */
export default function httpGetLocale(req: Request, _: Response, next: NextFunction) {
  try {
    const locale = req.headers["accept-language"];

    getLocale(locale, req);
    next();
  } catch (error: any) {
    next(handleHttpError(error, "httpGetLocale middleware error."));
  }
}
