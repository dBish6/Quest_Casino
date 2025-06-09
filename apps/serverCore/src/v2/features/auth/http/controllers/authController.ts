/**
 * Auth Controller
 *
 * Description:
 * Handles user authentication-related HTTP requests and responses.
 */

import type { Request, Response, NextFunction } from "express";

import type RegisterRequestDto from "@authFeatHttp/dtos/RegisterRequestDto";
import type { LoginRequestDto, GoogleLoginRequestDto } from "@authFeatHttp/dtos/LoginRequestDto";
import type { UpdateProfileRequestDto, UpdateUserFavouritesRequestDto, SendConfirmPasswordEmailRequestDto } from "@authFeatHttp/dtos/UpdateUserRequestDto";
import type { DeleteNotificationsRequestDto } from "@authFeatHttp/dtos/DeleteNotificationsRequestDto";
import type LogoutRequestDto from "@authFeatHttp/dtos/LogoutRequestDto";

import { logger } from "@qc/utils";
import { handleHttpError } from "@utils/handleError";
import { generateOStateToken } from "@qc/server";
import initializeSession from "@authFeatHttp/utils/initializeSession";
import updateUserSession from "@authFeatHttp/utils/updateUserSession";

import { User } from "@authFeat/models";
import { getUsers as getUsersService, getUser as getUserService } from "@authFeat/services/authService";
import * as httpAuthService from "@authFeatHttp/services/httpAuthService";
import { loginWithGoogle } from "@authFeatHttp/services/googleService";

const authService = { getUsers: getUsersService, getUser: getUserService, ...httpAuthService }

/**
 * Starts the user registration and checks if the user already exits within the database.
 * @controller
 * @response `success`, `conflict`, `HttpError` or `ApiError`.
 */
export async function register(
  req: RegisterRequestDto,
  res: Response,
  next: NextFunction
) {
  logger.debug("/auth/register body:", req.body);

  try {
    const exists = await User.exists({ email: req.body.email });
    if (exists)
      return res.status(409).json({
        name: "EMAIL_ALREADY_EXISTS",
        ERROR: req.locale.data.auth.error.EMAIL_ALREADY_EXISTS
      });

    await authService.registerUser({ ...req.body });

    return res.status(200).json({
      message: req.locale.data.auth.success.REGISTER,
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "register controller error."));
  }
}

/**
 * Initializes the current user session.
 * @controller
 * @response `success` with the client formatted user, `not found`, or `HttpError`.
 */
export async function login(
  req: LoginRequestDto,
  res: Response,
  next: NextFunction
) {
  try {
    const clientUser = await initializeSession(
      res,
      { by: "email", value: req.body.email },
      req.headers["x-xsrf-token"] as string
    );
    if (typeof clientUser === "string")
      return res.status(404).json({
        name: clientUser,
        ERROR: req.locale.data.auth.error[clientUser]
      });

    let message = req.locale.data.auth.success.LOGIN.replace(
      "{{username}}", clientUser.username
    );
    if (!clientUser.email_verified)
      message += req.locale.data.auth.success.LOGIN_VERIFY_NOTICE;

    return res.status(200).json({
      message,
      success: true,
      user: clientUser
    });
  } catch (error: any) {
    next(handleHttpError(error, "login controller error."));
  }
}
/**
 * Initializes the current user session via google.
 * @controller
 * @response `success`, `forbidden`, or `HttpError`.
 */
export async function loginGoogle(
  req: GoogleLoginRequestDto,
  res: Response,
  next: NextFunction
) {
  logger.debug("/auth/login/google body:", req.body);

  try {
    const { isNew, clientUser } = await loginWithGoogle(req, res);

    return res.status(200).json({
      message: req.locale.data.auth.success[
        isNew ? "LOGIN_NEW" : "LOGIN"
      ].replace("{{username}}", clientUser.username),
      success: true,
      user: clientUser,
      ...(isNew && {
        google_new: req.locale.data.auth.success.LOGIN_GOOGLE_NOTICE
      })
    });
  } catch (error: any) {
    next(handleHttpError(error, "loginGoogle controller error."));
  }
}

/**
 * Initiates email address verification.
 * @controller
 * @response `success`, `not found`, `forbidden`, or `HttpError`.
 */
export async function emailVerify(
  req: Request<{}, {}, { verification_token?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const updatedUser = await authService.emailVerify(
      req.userDecodedClaims!.sub
    );
    // Updates the access and refresh tokens and cookies.
    const { session, refresh } = req.cookies;
    await updateUserSession(req, res, updatedUser, {
      access: session,
      refresh
    });

    return res.status(200).json({
      message: req.locale.data.auth.success.EMAIL_VERIFY,
      success: true,
      user: { email_verified: updatedUser.email_verified }
    });
  } catch (error: any) {
    next(handleHttpError(error, "emailVerify controller error."));
  }
}
/**
 * Initiates verification email sending.
 * @controller
 * @response `success`, `SMTP rejected`, or `HttpError`.
 */
export async function sendVerifyEmail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await authService.sendVerifyEmail(req.userDecodedClaims!);
    
    const success = req.locale.data.auth.success;
    return res.status(200).json({
      message: success.SEND_EMAIL_VERIFY + success.SEND_EMAIL_VERIFY_INFO,
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "sendVerifyEmail controller error."));
  }
}

/**
 * Send all users or searched users by username, client formatted.
 * @controller
 * @response `success` with all users formatted for the client, `forbidden`, `HttpError` or `ApiError`.
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  const { general } = req.locale.data,
    { username, count } = req.query as Record<string, string>;
  let clientUsers;

  try {
    if (username) {
      // Search for username.
      clientUsers = await authService.searchUsers(username);
    } else if (!count && process.env.NODE_ENV !== "development") {
      // All users is restricted.
      return res.status(403).json({
        name: "ACCESS_DENIED",
        ERROR: general.error.ACCESS_DENIED
      });
    } else {
      // Else a random set of users based on count if provided.
      clientUsers = await authService.getUsers(true, parseInt(count, 10));
    }

    return res.status(200).json({
      message: `Successfully retrieved ${username ? "searched" : count ? `random ${count}` : "all"} users.`,
      success: true,
      users: clientUsers
    });
  } catch (error: any) {
    next(handleHttpError(error, "getUsers controller error."));
  }
}

/**
 * Send a user or current user or even a user's notifications, client formatted.
 * @controller
 * @response `success` with the current user formatted for the client, `not found`, `forbidden`, `HttpError` or `ApiError`.
 */
export async function getUser(req: Request, res: Response, next: NextFunction) {
  const { general } = req.locale.data,
    { notifications, email } = req.query as Record<string, string>;

  if (email && process.env.NODE_ENV !== "development")
    return res.status(403).json({
      name: "ACCESS_DENIED",
      ERROR: general.error.ACCESS_DENIED
    });

  try {
    let clientUser = await authService.getUser(
      {
        by: email ? "email" : "_id",
        value: email || req.userDecodedClaims!.sub
      },
      {
        forClient: !notifications,
        ...(notifications && { projection: "notifications" }),
        lean: true
      }
    );
    if (!clientUser)
      return res.status(404).json({
        name: "USER_NOT_FOUND",
        ERROR: general.error.USER_NOT_FOUND
      });

    if (notifications) {
      const result = await httpAuthService.getSortedUserNotifications(clientUser._id);
      clientUser = {
        friend_requests: clientUser!.notifications.friend_requests,
        notifications: result.notifications
      } as any;
    }

    return res.status(200).json({
      message:
        `Successfully retrieved ${notifications ? "the current user's notifications" : email ? `user ${email}` : "the current user"}.`,
      success: true,
      user: clientUser
    });
  } catch (error: any) {
    next(handleHttpError(error, "getUser controller error."));
  }
}

/**
 * Sends the current user's profile data to be displayed and or edited on the user's private profile page.
 * @controller
 * @response `success` with the current user formatted for the client, `not found`, `forbidden`, `HttpError` or `ApiError`.
 */
export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
  const username = req.query.username as string;

  try {
    const profileData = await authService.getUserProfile(
      username ? username : req.userDecodedClaims!.sub
    );

    return res.status(200).json({
      message: "Successfully retrieved the user's profile data.",
      success: true,
      user: profileData
    });
  } catch (error: any) {
    next(handleHttpError(error, "getUserProfile controller error."));
  }
}

/**
 * Initiates the update of the user's client profile and updates the session if needed.
 * @controller
 * @response `success` with updated user, `bad request`, `not found`, `forbidden`, `conflict`, `too many requests`, or `HttpError`.
 */
export async function updateProfile(
  req: UpdateProfileRequestDto, 
  res: Response, 
  next: NextFunction
) {
  const body = req.body;
  logger.debug("/auth/user PATCH body:", body);
  const { general, auth } = req.locale.data
  
  try {
    if (!Object.values(body).length) 
      return res.status(400).json({ name: "NO_DATA", ERROR: general.error.NO_DATA });
    const user = req.userDecodedClaims!;

    const { updatedUser, updatedFields, unfriended } = await authService.updateProfile(user, body);
    
    // Updates the access and refresh tokens and cookies if the email was updated.
    if (updatedUser) {
      const { session, refresh } = req.cookies;
      await updateUserSession(req, res, updatedUser, {
        access: session,
        refresh
      });
      // Also, sends the verification email again.
      authService.sendVerifyEmail(user);
    }

    return res.status(200).json({
      message: "Profile successfully updated.",
      success: true,
      user: updatedFields,
      ...(updatedUser && { refreshed: auth.success.SEND_EMAIL_VERIFY_INFO }),
      ...(unfriended && { unfriended })
    });
  } catch (error: any) {
    next(handleHttpError(error, "updateProfile controller error."));
  }
}

/**
 * Initiates storing or deleting the user's favourite games.
 * @controller
 * @response `success` with updated favourites, `bad request`, or `HttpError`.
 */
export async function updateUserFavourites(
  req: UpdateUserFavouritesRequestDto, 
  res: Response, 
  next: NextFunction
) {
  const favourites = req.body.favourites;

  try {
    if (!Array.isArray(favourites) || !favourites.length)
      return res.status(400).json({
        name: "NO_DATA_INVALID",
        ERROR: req.locale.data.general.error.NO_DATA_INVALID
      });

    const updatedFavourites = await authService.updateUserFavourites(
      req.userDecodedClaims!.sub,
      favourites
    );

    return res.status(200).json({ 
      message: "Successfully updated the user's favourites.",
      success: true,
      favourites: updatedFavourites
    });
  } catch (error: any) {
    next(handleHttpError(error, "updateUserFavourites controller error."));
  }
}

/**
 * Initiates the change of the user's password from the confirmation request.
 * @controller
 * @response `success`, `not found`, `too many requests`, or `HttpError`.
 */
export async function resetPassword(
  req: Request<{}, {}, { verification_token?: string }>, 
  res: Response, 
  next: NextFunction
) {
  logger.debug("/auth/user/reset-password body:", req.body);

  try {
    const { sub, email } = req.verDecodedClaims!;
    await authService.resetPassword(sub, email);

    return res.status(200).clearCookie("session").clearCookie("refresh").json({
      message: req.locale.data.auth.success.RESET_PASSWORD,
      success: true,
      oState: generateOStateToken()
    });
  } catch (error: any) {
    next(handleHttpError(error, "resetPassword controller error."));
  }
}

/**
 * Handles password confirmation requests from the profile or reset form and sends an email on success. 
 * Accepts either an old/new password combination or a verification token with a new password.
 * @controller
 * @response `success`, `bad request`, `forbidden`, `not found`, `too many requests`, `SMTP rejected`, or `HttpError`.
 */
export async function sendConfirmPasswordEmail(
  req: SendConfirmPasswordEmailRequestDto,
  res: Response,
  next: NextFunction
) {
  logger.debug("/auth/user/reset-password/confirm body:", req.body);
  const { password } = req.body,
    { general, auth } = req.locale.data;

  try {
    if (typeof password === "object") {
      if (!password.old && !password.new)
        return res.status(400).json({
          name: "NO_DATA_INVALID",
          ERROR: general.error.NO_DATA_INVALID
        });
    } else if (typeof password !== "string") {
      return res.status(403).json({
        name: "ACCESS_DENIED",
        ERROR: general.error.ACCESS_DENIED
      });
    }
 
    const { sub, email } = req.verDecodedClaims || req.userDecodedClaims!;
    await authService.sendConfirmPasswordEmail(sub, email, req.body);

    return res.status(200).json({
      message: auth.success.SEND_CONFIRM_PASSWORD_EMAIL,
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "sendResetPasswordEmail controller error."));
  }
}

/**
 * Initiates forgot password email sending.
 * @controller
 * @response `success`, `bad request`, `SMTP rejected`, or `HttpError`.
 */
export async function sendForgotPasswordEmail(
  req: Request<{}, {}, { email: string }>,
  res: Response,
  next: NextFunction
) {
  const email = req.body.email;
 
  try {
    if (!email) 
      return res.status(400).json({
        name: "NO_DATA_INVALID",
        ERROR: req.locale.data.general.error.NO_DATA_INVALID
      });

    await authService.sendForgotPasswordEmail(email);

    return res.status(200).json({
      message: req.locale.data.auth.success.SEND_FORGOT_PASSWORD_EMAIL,
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "sendResetPasswordEmail controller error."));
  }
}

/**
 * Stops the reset password process at confirmation.
 * @controller
 * @response `success` or `HttpError`.
 */
export async function revokePasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.revokePasswordResetConfirmation(req.userDecodedClaims!.sub);

    return res.status(200).json({
      message: "Password reset successfully canceled.",
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "clear controller error."));
  }
}

/**
 * Reinitializes the user session. Mainly for when the tokens reaches the refresh threshold with a socket
 * since sockets cannot update cookies directly, etc.
 * @controller
 * @response `success`, `not found`, or `HttpError`.
 */
export async function refresh(
  req: Request<{}, {}, { username: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await authService.getUser(
      { by: "username", value: req.body.username },
      {
        lean: true,
        throwDefault404: true
      }
    );

    const refreshResult = await initializeSession(res, {}, user);
    if (typeof refreshResult === "string")
      return res.status(404).json({
        name: refreshResult,
        ERROR: req.locale.data.auth.error[refreshResult]
      });

    return res.status(200).json({
      message: "Session successfully refreshed.",
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "refresh controller error."));
  }
}

/**
 * Clears the session cookie and deletes the csrf token.
 * @controller
 * @response `success`, `internal`, `HttpError` or `ApiError`.
 */
export async function logout(
  req: LogoutRequestDto,
  res: Response,
  next: NextFunction
) {
  try {
    await authService.logout(
      {
        access: req.cookies?.session,
        refresh: req.cookies?.refresh
      },
      req.body.username,
      req.headers["x-xsrf-token"] as string
    )
    .catch((error) => {
      if (req.body.lax) res.clearCookie("session").clearCookie("refresh");
      throw error;
    });

    return res.status(200).clearCookie("session").clearCookie("refresh").json({
      message: "Session cleared, log out successful.",
      success: true,
      oState: generateOStateToken()
    });
  } catch (error: any) {
    next(handleHttpError(error, "logout controller error."));
  }
}

/**
 * Clears every refresh token, csrf token and cookies from the current user.
 * @controller
 * @response `success` or `HttpError`.
 */
export async function wipeUser(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.wipeUser(req.userDecodedClaims!.sub);

    return res.status(200).clearCookie("session").clearCookie("refresh").json({
      message: "All refresh and csrf tokens successfully removed.",
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "clear controller error."));
  }
}

/**
 * Deletes the current user.
 * @controller
 * @response `success`, or `HttpError`.
 */
export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.userDecodedClaims!;

    await authService.deleteUser(user.sub);

    return res.status(200).json({
      message: `Successfully deleted user ${user.username} from existence`,
      success: true
    });
  } catch (error: any) {
    next(handleHttpError(error, "deleteUser controller error."));
  }
}

/**
 * Initiates deletion of the given user notifications.
 * @controller
 * @response `success` with sorted notifications, or `HttpError`.
 */
export async function deleteUserNotifications(
  req: DeleteNotificationsRequestDto, 
  res: Response, 
  next: NextFunction
) {
  const toDelete = req.body.notifications;

  try {
    const result = await httpAuthService.deleteUserNotifications(
      req.userDecodedClaims!.sub,
      toDelete,
      req.body.categorize
    );

    return res.status(200).json({
      message: `Successfully deleted ${toDelete.length} notifications from current user.`,
      success: true,
      user: { notifications: result.notifications }
    });
  } catch (error: any) {
    next(handleHttpError(error, "deleteUserNotifications controller error."));
  }
}
