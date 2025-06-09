import type { Request, Response } from "express";
import type { UserDoc } from "@authFeat/typings/User";

import { HttpError, handleHttpError } from "@utils/handleError";
import initializeSession from "./initializeSession";
import formatUserToClaims from "./formatUserToClaims";

import { JWTVerification } from "@authFeat/services/jwtService";

const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

/**
 * Updates the access and refresh tokens, along with their cookies, using the updated user.
 * @throws `HttpError 403` when either token is invalid.
 */
export default async function updateUserSession(
  req: Request,
  res: Response,
  updatedUser: UserDoc,
  tokens: { access: string; refresh: string }
) {
  const { verifyJwt, isJwtError } = new JWTVerification();

  try {
    const [accessClaims, refreshClaims] = Object.values(tokens).map((token, i) =>
      verifyJwt(token, i === 0 ? ACCESS_TOKEN_SECRET! : REFRESH_TOKEN_SECRET!, {
        ignoreExpiration: i === 0
      })
    );

    await initializeSession(
      res,
      {},
      updatedUser,
      {
        access: Math.max(0, accessClaims.exp! * 1000 - Date.now()),
        refresh: Math.max(0, refreshClaims.exp! * 1000 - Date.now())
      }
    );

    const { _id, ...newClaims } = formatUserToClaims(updatedUser);
    req.userDecodedClaims = { ...req.userDecodedClaims!, ...newClaims };
  } catch (error: any) {
    if (isJwtError(error)) // Should never happen since the verifyUserToken middleware is used before this and we have to extract the exps here because in verifyUserToken it can either be the access or refresh token.
      throw new HttpError("TOKEN_MULTIPLE_INVALID", "auth", 403);

    throw handleHttpError(error, "updateUserSession error.");
  }
}
