import type { LocaleData } from "@typings/Locale";
import type { ErrorResponse } from "@typings/ApiResponse";

declare global {
  interface Window {
    __PRELOADED_STATE__: any;
    __LOCALE_DATA__: LocaleData;
  }
}

// FIXME: FetchBaseQueryError is a bastard.
declare module "@reduxjs/toolkit/query" {
  interface FetchBaseQueryError {
    status: number | string;
    data?: ErrorResponse;
    error?: string;
  }
}

declare module "react-router-dom" {
  type To = string | Partial<{
    pathname: string;
    search: string | null;
    hash: string | null;
  }>;
}

declare module "express-serve-static-core" {
  interface Request {
    locale: string;
    restPath: string;
  }
}
