import type LocaleProvider from "@utils/LocaleProvider";
import type { UserClaims, VerificationClaims } from "@authFeat/typings/User";

declare module "express-serve-static-core" {
  interface Request {
    locale: LocaleProvider;
    userDecodedClaims?: UserClaims;
    verDecodedClaims?: VerificationClaims;
  }
}

declare module "http" {
  interface IncomingMessage {
    _query?: any;
    cookies?: Record<string, any>;
  }
}

declare module "socket.io" {
  interface Socket {
    locale: LocaleProvider;
    userDecodedClaims?: UserClaims;
  }
}
