import type { Request, Response, NextFunction } from "express";
import { logger } from "@qc/utils";
import { ApiError } from "@utils/handleError";

export default function httpErrorHandler(
  error: ApiError | Error,
  req: Request,
  res: Response,
  __: NextFunction
) {
  const err: any = error;

  if (
    err.statusCode === 500 ||
    err.name === "UNEXPECTED" ||
    !err.statusCode
  )
    logger.error(err.stack || err);

  return res.status(err.statusCode || 500).json({
    name: err.name,
    ...(process.env.NODE_ENV === "development" && {
      message: err.options.from || "unknown"
    }),
    ERROR: 
      req.locale?.resolveErrorMsg(err.category || "general", err.name, err.options?.var) || "Unexpectedly locale not initialized."
  });
}
