import type { Response } from "express";
import type { Identifier } from "@authFeat/services/authService";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { GetUserBy, UserDoc, User as UserFields } from "@authFeat/typings/User";

import { handleHttpError } from "@utils/handleError";
import formatUserToClaims from "./formatUserToClaims";

import { User } from "@authFeat/models";

import { populateUserDoc } from "@authFeat/services/authService";
import { GenerateUserJWT } from "@authFeat/services/jwtService";
import { deleteCsrfToken, generateCsrfToken } from "@authFeatHttp/services/csrfService";

/**
 * Initializes a user session by generating and setting JWT access and refresh tokens as cookies,
 * replaces the old CSRF token if it exists with a new one.
 * @param res Express response object.
 * @param identifier Object containing user get by and value.
 * @param csrfToken Replaces the current user's csrf token with a new one, or if a `UserDoc` is passed here it will only update the session cookies.
 * @param maxAge (Optional) expires for the access and refresh tokens.
 * @returns Client formatted user or the `UserDoc` that passed instead of the csrfToken.
 */
export default async function initializeSession(
  res: Response,
  identifier: Partial<Identifier<GetUserBy>>,
  csrfToken: string | UserDoc | undefined,
  maxAge?: { access: number; refresh: number; }
) {
  const isOnlyCookiesUpdate = typeof csrfToken === "object" && "member_id" in csrfToken;
  let user = csrfToken as UserDoc,
    clientUser = null

  try {
    if (!isOnlyCookiesUpdate) {
      const userQuery = User.findOne({ [identifier.by!]: identifier.value });
      user = await userQuery.exec() as UserDoc;
      if (!user) return "USER_NOT_FOUND_INIT";

      clientUser = await populateUserDoc(userQuery.clone())
        .client(identifier.by === "google_id")
        .populate("friends");
      clientUser!.friends = ({ pending: {}, list: {} }) as UserFields["friends"];
    }

    const userToClaims = formatUserToClaims(user),
      generateJWT = new GenerateUserJWT();

    const accessToken = generateJWT.accessToken(userToClaims),
      refreshToken = await generateJWT.refreshToken(userToClaims);

    res
      .cookie("session", accessToken, {
        path: "/",
        maxAge: maxAge?.access || generateJWT.expiry.access * 1000,
        httpOnly: true,
        secure: true,
        sameSite: "none"
      })
      .cookie("refresh", refreshToken, {
        path: "/",
        maxAge: maxAge?.refresh || generateJWT.expiry.refresh * 1000,
        httpOnly: true,
        secure: true,
        sameSite: "none"
      })
    if (typeof csrfToken === "undefined") {
      const [newCsrfToken] = await Promise.all([
        generateCsrfToken(user.id),
        ...(csrfToken ? [deleteCsrfToken(user.id, csrfToken)] : [])
      ]);
      res.setHeader("x-xsrf-token", newCsrfToken);
    }

    return (clientUser! as unknown) as UserCredentials & { email?: string } || user;
  } catch (error: any) {
    throw handleHttpError(error, "initializeSession error.");
  }
}
