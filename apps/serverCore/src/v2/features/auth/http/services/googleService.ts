import type { Response } from "express";
import type { GoogleLoginRequestDto } from "@authFeatHttp/dtos/LoginRequestDto";
import type { UserCredentials } from "@qc/typescript/typings/UserCredentials";
import type { InitializeUser } from "@authFeat/typings/User";

import { randomInt } from "crypto";
import { stringify } from "querystring";

import { logger } from "@qc/utils";
import { handleHttpError, HttpError } from "@utils/handleError";
import getCountriesMap from "@utils/getCountriesMap";
import { registerUser } from "./httpAuthService";
import initializeSession from "@authFeatHttp/utils/initializeSession";
import { updateUserCredentials } from "@authFeat/services/authService";

interface FetchAccessTokenSuccessDataDto {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface FetchUserInfoSuccessDataDto {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

function generateUsername(email: string) {
  const baseName = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `${baseName}${randomInt(1000, 99999).toString()}`;
}

/**
 * The country has to be defaulted. Since we don't have access to their country with Google, they would be 
 * prompted to change this.
 */
async function randomizeCountry() {
  const COUNTRIES = Array.from((await getCountriesMap().catch(() => new Map())));
  return COUNTRIES.length ? COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)][0] : "Canada";
}

/**
 * Authenticates a user using Google OAuth. Initializes the user session or registers them if
 * they don't already exist.
 */
export async function loginWithGoogle(
  req: GoogleLoginRequestDto,
  res: Response
) {
  try {
    const { code, redirect_uri = "" } = req.body;

    const token = await fetchAccessTokenToken(code, redirect_uri),
      userInfo = await fetchUserInfo(token);

    const clientUser = await initializeSession(
      res,
      { by: "google_id", value: userInfo.sub },
      req.headers["x-xsrf-token"] as string
    );
    if (typeof clientUser === "string") {
      const regUser: InitializeUser = {
        google_id: userInfo.sub,
        avatar_url: userInfo.picture,
        first_name: userInfo.given_name,
        last_name: userInfo.family_name,
        username: generateUsername(userInfo.email),
        email: userInfo.email,
        email_verified: userInfo.email_verified,
        password: "google provided",
        country: await randomizeCountry()
      };
      await registerUser(regUser);

      const clientUser = (await initializeSession(
        res,
        { by: "email", value: userInfo.email },
        req.headers["x-xsrf-token"] as string
      )) as UserCredentials;

      return { isNew: true, clientUser };
    } else {
      if (userInfo.email !== clientUser.email) {
        await updateUserCredentials(
          { by: "google_id", value: userInfo.sub },
          { $set: { email: userInfo.email } }
        ).catch(() => {
          throw new HttpError("PROFILE_NOT_FOUND_GOOGLE", "auth", 404);
        });
      }

      return { isNew: false, clientUser };
    }
  } catch (error: any) {
    throw handleHttpError(error, "loginWithGoogle service error.");
  }
}

async function fetchAccessTokenToken(code: string, redirectUri: string) {
  try {
    const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } = process.env;

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stringify({
          code,
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
          redirect_uri: redirectUri, // This is just to ensure the request is valid.
          grant_type: "authorization_code"
        })
      }),
      data = (await res.json()) as FetchAccessTokenSuccessDataDto;
    logger.debug("google fetchAccessTokenToken", res.status);

    if (!res.ok) {
      logger.error("fetchAccessTokenToken error:", data);
      throw new HttpError("TOKEN_GOOGLE", "auth", 403);
    }

    return data.access_token;
  } catch (error: any) {
    throw handleHttpError(error, "fetchIdToken error.");
  }
}

async function fetchUserInfo(token: string) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }),
      data = (await res.json()) as FetchUserInfoSuccessDataDto;
    logger.debug("google fetchUserInfo", res.status);

    if (!res.ok)
      throw new HttpError("INFO_GOOGLE", "auth", 403);

    return data;
  } catch (error: any) {
    throw handleHttpError(error, "fetchUserInfo error.");
  }
}
