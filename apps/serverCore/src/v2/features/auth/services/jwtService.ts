/**
 * JWT Service
 *
 * Description:
 * Handles functionally of user tokens (access, refresh, verification tokens).
 */

import type { UserToClaims, UserClaims, VerificationClaims } from "@authFeat/typings/User";

import jwt from "jsonwebtoken";

import { logger } from "@qc/utils";
import { handleApiError, ApiError } from "@utils/handleError";
import { redisClient } from "@cache";
import { ObjectId } from "mongoose";

const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, VERIFICATION_TOKEN_SECRET } = process.env;

/** Cache keys. */
export const KEY = (userId: ObjectId | string) => ({
  refresh: `user:${userId.toString()}:refresh_tokens`,
  verification: `user:${userId.toString()}:verification_token`
});

export class GenerateUserJWT {
  public readonly expiry: Readonly<{
    /** 15 minutes default. */
    access: number;
    /** 1 week default. */
    refresh: number;
    /** 20 minutes default. */
    verification: number;
  }>;

  constructor(
    expiry = { access: 60 * 15, refresh: 60 * 60 * 24 * 7, verification: 20 * 60 }
  ) {
    this.expiry = expiry;
  }

  public accessToken(user: UserToClaims, options?: Omit<jwt.SignOptions, "expiresIn">) {
    try {
      const { _id, ...rest } = user

      return this.token(
        ACCESS_TOKEN_SECRET!,
        { sub: _id.toString(), ...rest },
        { ...options, expiresIn: this.expiry.access }
      );
    } catch (error: any) {
      throw handleApiError(error, "GenerateUserJWT service error; accessToken.");
    }
  }

  public async refreshToken(user: UserToClaims, options?: Omit<jwt.SignOptions, "expiresIn">) {
    try {
      const { _id, ...rest } = user

      const refreshToken = this.token(
        REFRESH_TOKEN_SECRET!,
        { sub: _id.toString(), ...rest },
        { ...options, expiresIn: this.expiry.refresh }
      );
      // For verification afterwards.
      await redisClient.sAdd(KEY(_id).refresh, refreshToken);

      return refreshToken;
    } catch (error: any) {
      throw handleApiError(error, "GenerateUserJWT service error; refreshToken.");
    }
  }

  public async verificationToken(
    user: { _id?: ObjectId | string; sub?: string; email: string },
    options?: jwt.SignOptions
  ) {
    try {
      const userId = (user._id! || user.sub!).toString();

      const verificationToken = this.token(
        VERIFICATION_TOKEN_SECRET!,
        { sub: userId, email: user.email },
        { expiresIn: this.expiry.verification, ...options }
      );
      await redisClient.set(KEY(userId).verification, verificationToken);

      return verificationToken;
    } catch (error: any) {
      throw handleApiError(error, "GenerateUserJWT service error; verificationToken.");
    }
  }

  private token(
    secret: jwt.Secret,
    claims?: { sub?: string } & { [key: string]: any },
    options?: jwt.SignOptions
  ) {
    return jwt.sign(claims || {}, secret, { algorithm: "HS256", ...options });
  }
}

export class JWTVerification {
  public readonly REFRESH_THRESHOLD: number;

  constructor(refreshThreshold: number = 1000 * 60 * 3) {
    this.REFRESH_THRESHOLD = refreshThreshold;
  }

  /**
   * Verifies the user's access and refresh tokens. If the access token is missing, it attempts to verify the refresh token.
   */
  public async verifyUserToken(accessToken: string | undefined, refreshToken: string | undefined) {
    if (!accessToken) {
      logger.debug("Access token missing trying to refresh...")
      if (refreshToken) {
        return this.verifyRefreshToken(refreshToken);
      }

      throw new ApiError("TOKEN_SESSION_TOKENS_MISSING", "auth", 401, "unauthorized");
    }

    return this.verifyAccessToken(accessToken, refreshToken);
  }

  /**
   * Verifies the access token. Checks its validity and if it's within the refresh threshold or expired, it then checks the refresh token for validity.
   */
  public async verifyAccessToken(accessToken: string | undefined = "", refreshToken: string | undefined = "") {
    try {
      const decodedClaims = this.verifyJwt<UserClaims>(
        accessToken,
        ACCESS_TOKEN_SECRET!,
        { ignoreExpiration: true }
      );
      // logger.debug("Access token decodedClaims:", decodedClaims);

      const tokenExpiry = decodedClaims.exp! * 1000,
        currentTime = Date.now();
      // Signifies to refresh when within the refresh threshold.
      if (tokenExpiry - currentTime <= this.REFRESH_THRESHOLD) {
        const match = await this.isRefreshTokenMatching(
          decodedClaims.sub,
          refreshToken
        );
        if (!match)
          throw new ApiError("TOKEN_DISPARITY", "auth", 401, "unauthorized", {
            var: { token: "Refresh" }
          });

        return { claims: decodedClaims, threshold: true };
      } else if (tokenExpiry <= currentTime) {
        throw new ApiError("TOKEN_EXPIRED", "auth", 403, "forbidden", {
          var: { token: "Access" }
        });
      }

      return { claims: decodedClaims, threshold: false };
    } catch (error: any) {
      if (this.isJwtError(error))
        throw new ApiError("TOKEN_INVALID", "auth", 403, "forbidden", {
          var: { token: "Access" }
        });

      throw handleApiError(error, "JWTVerification service error; verifyAccessToken.");
    }
  }

  /**
   * Verifies the refresh token. Checks its validity and matches it against the cache.
   */
  public async verifyRefreshToken(refreshToken: string | undefined = "") {
    try {
      const decodedClaims = this.verifyJwt<UserClaims>(
        refreshToken,
        REFRESH_TOKEN_SECRET!
      );
      // logger.debug("Refresh token decodedClaims:", decodedClaims);

      const match = await this.isRefreshTokenMatching(
        decodedClaims.sub,
        refreshToken
      );
      if (!match)
        throw new ApiError("TOKEN_DISPARITY", "auth", 401, "unauthorized", {
          var: { token: "Refresh" }
        });

      return { claims: decodedClaims, threshold: true };
    } catch (error: any) {
      if (this.isJwtError(error))
        throw new ApiError("TOKEN_REFRESH_INVALID", "auth", 403, "forbidden");
      
      throw handleApiError(error, "JWTVerification service error; verifyRefreshToken.");
    }
  }

  /**
   * Verifies the verification token. Checks its validity and matches it against the cache.
   */
  public async verifyVerificationToken(verificationToken: string | undefined) {
    try {
      if (!verificationToken)
        throw new ApiError("TOKEN_VERIFY_EXPIRED_MISSING", "auth", 401, "unauthorized");

      const decodedClaims = this.verifyJwt<VerificationClaims>(
        verificationToken,
        VERIFICATION_TOKEN_SECRET!,
        { ignoreExpiration: true }
      );
      logger.debug("Verification token decodedClaims:", decodedClaims);
      if (decodedClaims.exp! * 1000 <= Date.now())
        throw new ApiError("TOKEN_EXPIRED", "auth", 403, "forbidden", {
          var: { token: "Verification" }
        });

      const cachedToken = await redisClient.get(KEY(decodedClaims.sub).verification);
      if (cachedToken !== verificationToken)
        throw new ApiError("TOKEN_DISPARITY", "auth", 401, "unauthorized", {
          var: { token: "Verification" }
        });

      return decodedClaims;
    } catch (error: any) {
      if (this.isJwtError(error))
        throw new ApiError("TOKEN_INVALID", "auth", 403, "forbidden", {
          var: { token: "Verification" }
        });
      
      throw handleApiError(error, "JWTVerification service error; verificationToken.");
    }
  }

  /**
   * Extracts the decoded claims from either the `access` or `refresh` token and returns the first valid claims.
   * Ignores all JWT errors and returns `null` if neither of the tokens return valid claims.
   */
  public getFirstValidUserClaims({ access = "", refresh = "" }) {
    try {
      for (const [key, token] of Object.entries({ access, refresh })) {
        try {
          const claims = this.verifyJwt<UserClaims>(
            token,
            key === "access" ? ACCESS_TOKEN_SECRET! : REFRESH_TOKEN_SECRET!
          );
          return claims;
        } catch (error) {
          if (!this.isJwtError(error)) throw error;
        }
      }

      return null;
    } catch (error: any) {
      throw handleApiError(error, "JWTVerification service error; getFirstValidUserClaims.");
    }
  }

  /**
   * Verifies the integrity of a JWT and returns the given claims type.
   */
  public verifyJwt<TClaims extends jwt.JwtPayload>(
    token: string,
    secretOrPublicKey: jwt.Secret,
    VerifyOptions?: jwt.VerifyOptions
  ) {
    return jwt.verify(token, secretOrPublicKey, VerifyOptions) as TClaims;
  }

  public isJwtError(err: any) {
    return err instanceof jwt.JsonWebTokenError || err instanceof jwt.NotBeforeError;
  }

  /**
   * Checks if the provided refresh token matches the cache for the given user.
   */
  private async isRefreshTokenMatching(userId: ObjectId | string, token: string) {
    return await redisClient.sIsMember(KEY(userId).refresh, token);
  }
}

/**
 * Removes a specific refresh token from a user in the cache.
 */
export async function clearSession(userId: ObjectId | string, refreshToken: string) {
  try {
    await redisClient.sRem(KEY(userId).refresh, refreshToken);
  } catch (error: any) {
    throw handleApiError(error, "clearSession service error.");
  }
}

/**
 * Removes all refresh tokens in the cache from the given user.
 */
export async function clearAllSessions(userId: ObjectId | string) {
  try {
    await redisClient.del(KEY(userId).refresh);
  } catch (error: any) {
    throw handleApiError(error, "clearAllSessions service error.");
  }
}

/**
 * Removes the verification token from a user in the cache.
 */
export async function revokeVerificationToken(userId: ObjectId | string) {
  try {
    await redisClient.del(KEY(userId).verification);
  } catch (error: any) {
    throw handleApiError(error, "revokeVerificationToken service error.");
  }
}
