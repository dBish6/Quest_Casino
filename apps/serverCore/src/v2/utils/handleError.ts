import type FeatureCategory from "@typings/FeatureCategory";
import type { Socket } from "socket.io";
import type SocketCallback from "@typings/SocketCallback";
import type SocketExtendedError from "@qc/typescript/typings/SocketExtendedError";

import { logger } from "@qc/utils";
import errorNotLocalized from "./errorNotLocalized";

export class ApiError extends Error {
  /** What 'level' or type the error is. */
  public type: "api" | "http" | "socket";
  /** The feature name. */
  public category: FeatureCategory;
  /** Status number code (for HTTP). */
  public statusCode: number;
  /** Status as text (for Socket). */
  public status: string;
  public options: {
    /** Variables for locale data markers (e.g. {{username}}). */
    var?: Record<string | number, any>;
    /** Explains where the error is. */
    from?: string;
  }

  constructor(
    name: string,
    category: FeatureCategory = "general",
    statusCode = 500,
    status = "internal error",
    options: ApiError["options"] = {},
    message = ""
  ) {
    super(message);
    this.name = name;
    this.type = "api";
    this.category = category;
    this.statusCode = statusCode;
    this.status = status;
    this.options = options;
  }
}

export class HttpError extends ApiError {
  constructor(
    name: string,
    category?: FeatureCategory,
    statusCode?: number,
    options: ApiError["options"] = {},
    message = ""
  ) {
    super(name, category, statusCode, "", options, message);
    this.type = "http";
  }
}

export class SocketError extends ApiError {
  constructor(
    name: string,
    category?: FeatureCategory,
    status?: string,
    options: ApiError["options"] = {},
    message = ""
  ) {
    super(name, category, 0, status, options, message);
    this.type = "socket";
  }
}

const isCustomError = (error: any) => error instanceof HttpError || error instanceof SocketError || error instanceof ApiError;

/**
 * Use for 'critical' errors for both `http` and `socket`.
 */
export function handleApiError(
  error: HttpError | SocketError | ApiError | Error,
  from: string,
  status?: { code: number, text: string },
) {
  if (isCustomError(error)) {
    if (errorNotLocalized(error.name)) error.name = "ApiError";
    error.options.from = error.options.from || from;
    return error;
  } else {
    return new ApiError(
      "UNEXPECTED",
      "general",
      status?.code,
      status?.text,
      { from },
      error.message || "An unexpected error occurred."
    );
  }
}

/**
 * Use for 'critical' errors for `http`.
 */
export function handleHttpError(
  error: HttpError | ApiError | Error,
  from: string,
  statusCode?: number
) {
  if (isCustomError(error)) {
    if (errorNotLocalized(error.name)) error.name = "HttpError";
    error.options.from = error.options.from || from;
    return error;
  } else {
    return new HttpError(
      "UNEXPECTED",
      "general",
      statusCode,
      { from },
      error.message || "An unexpected error occurred."
    );
  }
}

export function handleSocketError(
  callback: SocketCallback,
  socket: Socket,
  error: SocketError | ApiError | Error,
  from: string
) {
  let err: any = error;

  if (
    err.status === "internal error" ||
    err.name === "UNEXPECTED" ||
    !err.status
  )
    logger.error(err.stack || err);

  if (isCustomError(error)) {
    if (errorNotLocalized(error.name)) err.name = "SocketError";
    err.options.from = err.options.from || from;
  } else {
    err = new SocketError("UNEXPECTED", "general", "internal error", { from });
  }

  callback({
    status: err.status || "internal error",
    ...(process.env.NODE_ENV === "development" && {
      message: err.options.from || "unknown"
    }),
    name: err.name,
    ERROR:
      socket.locale?.resolveErrorMsg(err.category || "general", err.name, {
        ...(isCustomError(error) && { ...error.options.var })
      }) || "Unexpectedly locale not initialized."
  });
}

/**
 * To properly format error payloads for socket middlewares.
 */
export function handleSocketMiddlewareError(
  socket: Socket,
  error: SocketError | ApiError | Error,
  from: string
): SocketExtendedError {
  let err: any = error;
  
  if (err.status === "internal error" || !err.status) logger.error(err.stack || err);

  if (!(error instanceof SocketError || error instanceof ApiError)) {
    err = new SocketError("UNEXPECTED", "general", "internal error", { from });
  } else if (errorNotLocalized(error.name)) {
    error.name = "SocketMiddlewareError";
  }

  delete err.stack;
  return {
    ...err,
    ...(process.env.NODE_ENV === "development" && { message: err.options.from || from || "unknown" }),
    data: {
      name: err.name,
      ERROR:
        socket.locale?.resolveErrorMsg(err.category, err.name, {
          ...(isCustomError(error) && { ...error.options.var })
        }) || "NOT INITIALIZED",
      status: err.status
    }
  };
}
