/**
 * HTTP Auth Service
 *
 * Description:
 * Handles HTTP-related functionalities related to user authentication and management.
 */

import type { ObjectId, ClientSession, UpdateWriteOpResult } from "mongoose";
import type { InitializeUser, UserNotification, UserNotificationField, UserClaims, UserDoc, User as UserFields } from "@authFeat/typings/User";

import type { Notification } from "@qc/typescript/dtos/NotificationsDto";
import type { UpdateProfileBodyDto, UpdateUserFavouritesBodyDto, SendConfirmPasswordEmailBodyDto } from "@qc/typescript/dtos/UpdateUserDto";

import { Types, isValidObjectId, startSession  } from "mongoose";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { hash, compare } from "bcryptjs";

import { AVATAR_FILE_EXTENSIONS } from "@qc/constants";

import { logger, delay } from "@qc/utils";
import { handleHttpError, HttpError } from "@utils/handleError";
import trackAttempts from "@authFeatHttp/utils/trackAttempts";
import isUuidV4 from "@utils/isUuidV4";
import userProfileAggregation from "@authFeatHttp/utils/userProfileAggregation";
import { getSocketAuthService } from "@authFeat/socket/namespaces/authNamespace";
import getSocketId from "@utils/getSocketId";
import { KEY } from "@authFeat/utils/activityRedisKey";

import { User, UserFriends, UserStatistics, UserActivity, UserNotifications } from "@authFeat/models";
import { redisClient } from "@cache";
import { s3 } from "@aws";

import { MINIMUM_USER_FIELDS, updateUserCredentials, updateUserFriends, getUser, getUserFriends } from "@authFeat/services/authService";
import { formatEmailTemplate, sendEmail } from "@authFeatHttp/services/emailService";
import { GenerateUserJWT, revokeVerificationToken, clearAllSessions, JWTVerification  } from "@authFeat/services/jwtService";
import { deleteCsrfToken, deleteAllCsrfTokens } from "@authFeatHttp/services/csrfService";

const { CDN_URL, AWS_S3_BUCKET } = process.env;
const ALLOWED_PROFILE_UPDATE_FIELDS: ReadonlySet<string> = new Set(["avatar_url", "first_name", "last_name", "username", "bio", "email", "country", "region", "phone_number", "settings"]),
  ALLOWED_PROFILE_UPDATE_SETTINGS_FIELDS: ReadonlySet<string> = new Set(["notifications", "blocked_list", "visibility", "block_cookies"]);

const PASSWORD_CACHE_KEY = (userId: ObjectId | string) => `user:${userId.toString()}:pending_password`;

/**
 * Registers a new user in the database.
 */
export async function registerUser(user: InitializeUser) {
  const userId = new Types.ObjectId();

  try {
    if (!user.google_id) user.password = await hash(user.password, 12);

    const session = await startSession();

    await session.withTransaction(async () => {
      const docs = [
        new User({
          _id: userId,
          legal_name: { first: user.first_name, last: user.last_name },
          friends: userId,
          statistics: userId,
          activity: userId,
          notifications: userId,
          ...user
        }),
        new UserFriends({ _id: userId }),
        new UserStatistics({ _id: userId }),
        new UserActivity({ _id: userId }),
        new UserNotifications({ _id: userId })
      ];
      for (const doc of docs) await doc.save({ session });
    }).finally(() => session.endSession());

    logger.info(`User ${userId} was successfully registered in the database.`);
  } catch (error: any) {
    throw handleHttpError(error, "registerUser service error.");
  }
}

/**
 * Verifies the user's verification token that was used to create the unique verification link
 * and returns the verified user.
 * @throws `HttpError 403` invalid verification token.
 * @throws `HttpError 404` user not found.
 */
export async function emailVerify(userId: ObjectId | string) {
  try {
    const updatedUser = await updateUserCredentials(
      { by: "_id", value: userId },
      { $set: { email_verified: true } },
      { new: true, lean: true }
    );
    await revokeVerificationToken(userId);
    
    return updatedUser;
  } catch (error: any) {
    throw handleHttpError(error, "emailVerify service error.");
  }
}
/**
 * Sends an email with a verification link to the specified email address.
 * @throws `HttpError 541` SMTP rejected.
 */
export async function sendVerifyEmail(user: UserClaims) {
  const generateJWT = new GenerateUserJWT();

  try {
    const verificationToken = await generateJWT.verificationToken(user);
    await sendEmail(user.email, formatEmailTemplate("verify", { token: verificationToken }));
  } catch (error: any) {
    throw handleHttpError(error, "sendVerifyEmail service error.");
  }
}

/**
 * Searches for users in the database based on a username.
 */
export async function searchUsers(username: string) {
  try {
    return await User.find({
      username: { $regex: username, $options: "i" }
    }).select(MINIMUM_USER_FIELDS).limit(50).lean();
  } catch (error: any) {
    throw handleHttpError(error, "searchUsers service error.");
  }
}

/**
 * Gets all notifications of a user from the database sorted by created_at, categorized or un-categorized.
 */
export async function getSortedUserNotifications(
  userId: ObjectId | string,
  categorize = true
): Promise<{ notifications: UserNotificationField } | { notifications: UserNotification[] }> {
  let result
  
  try {
    if (categorize) {
      result = await UserNotifications.aggregate([
        { $match: { _id: new Types.ObjectId(userId as string) } },
        {
          $facet: {
            news: [
              { $unwind: "$notifications.news" },
              { $sort: { "notifications.news.created_at": -1 } },
              { $project: { notification: "$notifications.news" } }
            ],
            system: [
              { $unwind: "$notifications.system" },
              { $sort: { "notifications.system.created_at": -1 } },
              { $project: { notification: "$notifications.system" } }
            ],
            general: [
              { $unwind: "$notifications.general" },
              { $sort: { "notifications.general.created_at": -1 } },
              { $project: { notification: "$notifications.general" } }
            ]
          }
        },
        {
          $project: {
            notifications: {
              news: "$news.notification",
              system: "$system.notification",
              general: "$general.notification"
            }
          }
        }
      ]);
    } else {
      result = await UserNotifications.aggregate([
        { $match: { _id: new Types.ObjectId(userId as string) } },
        {
          $project: {
            notifications: {
              $concatArrays: [
                "$notifications.news",
                "$notifications.system",
                "$notifications.general"
              ]
            }
          }
        },
        { $unwind: "$notifications" },
        { $sort: { "notifications.created_at": -1 } },
        { $group: { _id: 0, notifications: { $push: "$notifications" } } },
        { $project: { _id: 0, notifications: 1 } }
      ])
    }

    return result.length > 0 ? result[0] : { notifications: { news: [], system: [], general: [] } };
  } catch (error: any) {
    throw handleHttpError(error, "getUserNotifications service error.");
  }
}
/**
 * Delete one or multiple notifications of a user from the database.
 */
export async function deleteUserNotifications(
  userId: ObjectId | string,
  notifications: Notification[],
  categorize?: boolean
) {
  try {
    if (notifications.length > 1) {
      await UserNotifications.bulkWrite(
        notifications.map((toDelete) => ({
          updateOne: {
            filter: { _id: userId },
            update: {
              $pull: {
                [`notifications.${toDelete.type}`]: { notification_id: toDelete.notification_id }
              }
            }
          }
        }))
      );
    } else {
      const toDelete = notifications[0];
      await UserNotifications.findOneAndUpdate(
        { _id: userId },
        { $pull: { [`notifications.${toDelete.type}`]: { notification_id: toDelete.notification_id } } }
      );
    }

    return getSortedUserNotifications(userId, categorize);
  } catch (error: any) {
    throw handleHttpError(error, "deleteUserNotifications service error.");
  }
}

/**
 * Gets specific user profile data from the database needed for the client.
 * @throws `HttpError 404` user not found.
 */
export async function getUserProfile(idOrUsername: ObjectId | string) {
  try {
    const privateProfile = isValidObjectId(idOrUsername),
      publicProfile = !privateProfile && typeof idOrUsername === "string";

    if (!privateProfile && !publicProfile) throw new HttpError("ACCESS_DENIED", "general", 403);

    const profileData = await User.aggregate([
      {
        $match: privateProfile
          ? { _id: new Types.ObjectId(idOrUsername as string) }
          : { username: idOrUsername }
      },
      
      ...userProfileAggregation(publicProfile),

      {
        $project: {
          _id: 1,
          email: 1,
          activity: { game_history: "$activityData.game_history" },
          ...(publicProfile && {
            member_id: 1,
            username: 1,
            legal_name: 1,
            avatar_url: 1,
            country: 1,
            bio: 1,
            statistics: "$statisticsData"
          })
        }
      }
    ]);
    if (!profileData?.length) throw new HttpError("USER_NOT_FOUND_SYSTEM", "general", 404);

    let user = profileData[0];
    if (publicProfile) {
      const activityStatus = (await redisClient.get(KEY(profileData[0]._id).status)) || "offline";
      user.activity.status = activityStatus;
    }
    delete user._id;

    return user;
  } catch (error: any) {
    throw handleHttpError(error, "getUserProfile service error.");
  }
}

/**
 * Updates the user's profile details based on the client edit.
 * @throws `HttpError 400` when avatar_url is not a image or the url isn't valid.
 * @throws `HttpError 403` forbidden if a unusual key is passed in the body or if there is more fields in the body when the avatar_url is requested.
 * @throws `HttpError 404` user not found.
 * @throws `HttpError 409` conflict if there is a pending password and they request to change their email. 
 * @throws `HttpError 429` too many update attempts.
 */
export async function updateProfile(user: UserClaims, body: UpdateProfileBodyDto) {
  let session: ClientSession | undefined;

  try {
    return await trackAttempts<{ updatedUser: UserDoc; updatedFields: UpdateProfileBodyDto; unfriended?: true }>(
      user.sub,
      "update_profile_attempts",
      { name: "UPDATE_PROFILE_ATTEMPTS", category: "auth" },
      async () => {
        if ((await redisClient.get(PASSWORD_CACHE_KEY(user.sub))) && body.email)
          throw new HttpError("PASS_CONFIRM_STILL_PENDING", "auth", 409);

        const bodyKeys = Object.keys(body);

        for (const field of bodyKeys) {
          if (!ALLOWED_PROFILE_UPDATE_FIELDS.has(field))
            throw new HttpError("ACCESS_DENIED_CRED", "general", 403);
          else if (!body[field as keyof UpdateProfileBodyDto]) delete body[field as keyof UpdateProfileBodyDto];

          if (field === "settings") {
            for (const settingField of Object.keys(body.settings!)) {
              if (!ALLOWED_PROFILE_UPDATE_SETTINGS_FIELDS.has(settingField))
                throw new HttpError("ACCESS_DENIED_CRED", "general", 403);
            }
          }
        }

        let query: {
          $set: { [key in keyof UserFields]?: any };
          $unset: { [key in keyof UserFields]?: any };
        } = { $set: {}, $unset: {} };
        let updatedFriends: UpdateWriteOpResult | undefined;

        // Single updates for the avatar.
        if (body.avatar_url) {
          if (bodyKeys.length > 1) throw new HttpError("ACCESS_DENIED", "general", 403);
 
          const match = (body.avatar_url as string).match(/^data:image\/(.*?);base64,(.+)$/);
          if (!AVATAR_FILE_EXTENSIONS.has((match || [""])[1]))
            throw new HttpError("AVATAR_URL_INVALID", "auth", 400);

          const fileBuffer = Buffer.from(match![2], "base64");
          if (fileBuffer.length > 500 * 1024)
            throw new HttpError("AVATAR_URL_TOO_LARGE", "auth", 400);

          const ext = match![1],
            path = `avatars/${user.member_id}/avatar.${ext}`;

          // Overrides
          await s3.send(
            new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET, Key: path})
          );
          const result = await s3.send(new PutObjectCommand({
            Bucket: AWS_S3_BUCKET,
            Key: path,
            Body: Buffer.from(match![2], "base64"),
            ContentType: `image/${ext}`
          }));

          query.$set.avatar_url = `${CDN_URL}/${path}`;
        }
        // Only should be their settings being updated. 
        else if (body.settings) {
          if (bodyKeys.length > 1) throw new HttpError("ACCESS_DENIED", "general", 403);

          if (body.settings.blocked_list) {
            for (const blkUser of body.settings.blocked_list) {
              if (!["delete", "add"].includes(blkUser.op) || !isUuidV4(blkUser.member_id))
                throw new HttpError("NO_DATA_INVALID", "general", 400);

              if (blkUser.op === "add") {
                if (body.settings!.blocked_list.length > 1) throw new HttpError("ACCESS_DENIED", "general", 403); // Should never be multiple users being blocked (you can only block when viewing a single user profile).

                const blkUserDoc = await getUser(
                  { by: "member_id", value: blkUser.member_id },
                  {
                    projection: "_id",
                    lean: true
                  }
                );
                if (!blkUserDoc)
                  throw new HttpError("USER_BLOCKED_NOT_FOUND", "auth", 404);

                const userFriendsDoc = await getUserFriends(user.sub, { lean: true });
                // Removes the newly blocked user from the current user's friends list and blocked user's if in friends list.
                if (userFriendsDoc.list.has(blkUser.member_id)) {
                  session = await startSession();
                  session.startTransaction();

                  updatedFriends = await updateUserFriends(
                    { by: "_id", value: user.sub },
                    { $unset: { [`list.${blkUser.member_id}`]: "" } },
                    { session }
                  );
                  await updateUserFriends(
                    { by: "_id", value: blkUserDoc._id },
                    { $unset: { [`list.${user.member_id}`]: "" } },
                    { session }
                  );
                  const socketAuthService = getSocketAuthService();

                  const friendSocketIds = await getSocketId(blkUser.member_id, "auth");
                  for (const socketId of friendSocketIds)
                    socketAuthService.emitFriendUpdate({ remove: { list: user.member_id } }, socketId);

                  socketAuthService.emitFriendUpdate({ remove: { list: blkUser.member_id } });

                  await socketAuthService.emitNotification(
                    { _id: blkUserDoc._id, member_id: blkUser.member_id },
                    { type: "general", title: "Unfriended", message: `${user.username} just unfriended you.` },
                    { silent: true }
                  );
                }

                query.$set = { [`settings.blocked_list.${blkUser.member_id}`]: blkUserDoc._id };
              } else {
                (query.$unset as any)[`settings.blocked_list.${blkUser.member_id}`] = "";
              }
            }
          }
        }
        // Everything else.
        else {
          const { first_name, last_name, ...rest } = body;
          query.$set = {
            ...rest,
            ...(first_name && { "legal_name.first": first_name }),
            ...(last_name && { "legal_name.last": last_name }),
            ...(rest.email && { email_verified: false })
          };
        }

        const updatedUser = await updateUserCredentials(
          {
            by: "_id",
            value: user.sub,
            ...(query.$set.country && { $expr: { $lte: [{ $ifNull: ["$limit_changes.country", 0] }, 2] } }) // Only can be 2 changes to their country.
          },
          {
            ...query,
            ...(query.$set.country && {
              $inc: { "limit_changes.country": 1 },
              ...(!query.$set.region && { $unset: { region: "" } })
            })
          },
          {
            session,
            projection: 
              `-_id ${bodyKeys} ${(query.$set as any)["legal_name.first"] || (query.$set as any)["legal_name.last"] ? "legal_name" : ""}`,
            runValidators: true,
            new: true,
            lean: true
          }
        );
        if (!updatedUser)
          throw new HttpError("COUNTRY_UPDATE_LIMIT", "auth", 400);

        if (updatedUser?.settings?.blocked_list) {
          updatedUser.settings.blocked_list = Object.fromEntries(
            updatedUser.settings.blocked_list
          ) as any;
        }

        // updatedFriends should be defined when there is a session.
        await session?.commitTransaction();

        return {
          ...(query.$set.email && {
            updatedUser: {
              ...(await getUser({ by: "_id", value: user.sub }, {
                lean: true,
                throwDefault404: true
              }))
            }
          }),
          updatedFields: updatedUser,
          ...(updatedFriends && { unfriended: true })
        };
      }
    );
  } catch (error: any) {
    await session?.abortTransaction();
    throw handleHttpError(error, "updateProfile service error.", 500);
  } finally {
    session?.endSession();
  }
}

/**
 * Updates the user's favourite games in bulk by either adding or deleting
 * entries from the database.
 */
export async function updateUserFavourites(
  userId: ObjectId | string,
  favourites: UpdateUserFavouritesBodyDto["favourites"]
) {
  try {
    await User.bulkWrite(
      favourites.map((favourite) => {
        if (!["delete", "add"].includes(favourite.op) || !favourite.title)
          throw new HttpError("NO_DATA_INVALID", "general", 400);

        const isAdd = favourite.op === "add";
        return {
          updateOne: {
            filter: { _id: userId },
            update: {
              [isAdd ? "$set" : "$unset"]: {
                [`favourites.${favourite.title}`]: isAdd ? true : ""
              }
            }
          }
        };
      })
    );
    const updatedUser = await User.findById(userId).select("favourites").lean();
    if (!updatedUser) throw new HttpError("USER_NOT_FOUND_VAL", "general", 404);

    return updatedUser?.favourites;
  } catch (error: any) {
    throw handleHttpError(error, "updateUserFavourites service error.");
  }
}

/**
 * Updates the user's password in the database, clears all sessions and sends a success email.
 * @throws `HttpError 404` no pending password.
 * @throws `HttpError 429` too many update attempts.
 */
export async function resetPassword(userId: string, email: string) {
  try {
    await trackAttempts(
      userId,
      "reset_password_attempts",
      { name: "RESET_PASSWORD_ATTEMPTS", category: "auth" },
      async () => {
        const pendingPassword = await redisClient.get(PASSWORD_CACHE_KEY(userId));
        // This error should pretty much never happen since the token and this cache entry has the same expiry.
        if (!pendingPassword)
          throw new HttpError("RESET_PASSWORD_EXPIRED", "auth", 404);

        await updateUserCredentials(
          { by: "_id", value: userId },
          { $set: { password: pendingPassword } }
        );
        await Promise.all([
          wipeUser(userId),
          revokeVerificationToken(userId)
        ]);

        await sendEmail(email, formatEmailTemplate("passwordResetSuccess"));
      },
      { max: 4 }
    );
  } catch (error: any) {
    throw handleHttpError(error, "resetPassword service error.");
  }
}

/**
 * Sends a confirmation email with a verification token to confirm their password change.
 * Handles both forgot password and profile password reset flows.
 * @throws `HttpError 400` passwords doesn't match if reset.
 * @throws `HttpError 404` user not found if reset.
 * @throws `HttpError 429` too many requests.
 */
export async function sendConfirmPasswordEmail(
  userId: string,
  email: string, 
  body: SendConfirmPasswordEmailBodyDto
) {
  const generateJWT = new GenerateUserJWT();

  try {
    await trackAttempts(
      userId,
      "reset_password_attempts",
      { name: "RESET_PASSWORD_ATTEMPTS", category: "auth" },
      async () => {
        const isForgot = "verification_token" in body; // From forgot reset form else from profile reset form.
        let newPassword = isForgot ? body.password : body.password.new as string;

        const user = await getUser({ by: "_id", value: userId }, {
          projection: "-_id password",
          lean: true,
          throwDefault404: true
        });
        if (await compare(newPassword, user.password))
          throw new HttpError("PROVIDE_NEW_PASSWORD", "auth", 400);

        if (!isForgot && !(await compare(body.password.old as string, user.password)))
            throw new HttpError("OLD_PASSWORD_MISMATCH", "auth", 400);

        newPassword = await hash(isForgot ? body.password : body.password.new as string, 12);
        const [verificationToken] = await Promise.all([
          generateJWT.verificationToken({ _id: userId, email }, { expiresIn: 15 * 60 }),
          redisClient.set(PASSWORD_CACHE_KEY(userId), newPassword, { EX: 15 * 60 })
        ]);

        await sendEmail(email, formatEmailTemplate("confirmPassword", { token: verificationToken }));
      }
    );
  } catch (error: any) {
    throw handleHttpError(error, "sendConfirmPasswordEmail service error.");
  }
}

/**
 * Generates a verification token and sends the forgot password email if the user exists.
 */
export async function sendForgotPasswordEmail(email: string) {
  const generateJWT = new GenerateUserJWT();

  try {
    const user = await getUser({ by: "email", value: email }, { projection: "email", lean: true });

    if (user) {
      const verificationToken = await generateJWT.verificationToken(user, { expiresIn: 60 * 60 * 24 }); // 24 hours.
      await sendEmail(user.email, formatEmailTemplate("forgotPassword", { token: verificationToken }));
    } else {
      await delay(200);
    }
  } catch (error: any) {
    throw handleHttpError(error, "sendForgotPasswordEmail service error.");
  }
}

/**
 * Deletes the verification token and pending password from the cache.
 */
export async function revokePasswordResetConfirmation(userId: ObjectId | string) {
  try {
    await Promise.all([
      revokeVerificationToken(userId),
      redisClient.del(PASSWORD_CACHE_KEY(userId))
    ]);
  } catch (error: any) {
    throw handleHttpError(error, "revokePasswordResetConfirmation service error.");
  }
}

/**
 * Logs out the user by attempting to find the user through the access and refresh tokens. If that fails,
 * it falls back to retrieving the user from the database. Lastly, deleting the user's cached CSRF token
 * if the user is found
 * @throws `HttpError 404` user not found.
 */
export async function logout(
  { access = "", refresh = "" },
  username: string,
  csrfToken = ""
) {
  const jwtVerification  = new JWTVerification();

  try {
    let user;

    user = jwtVerification.getFirstValidUserClaims({ access, refresh });
    if (!user) {
      user = await getUser({ by: "username", value: username }, {
        projection: "_id",
        lean: true
      });
      if (!user) throw new HttpError("USER_NOT_FOUND_LOGOUT", "auth", 404);
    }

    await deleteCsrfToken((user as UserClaims).sub || user._id, csrfToken);

    return user;
  } catch (error: any) {
    throw handleHttpError(error, "logout service error.");
  }
}

/**
 * Deletes the user's refresh tokens and csrf tokens.
 */
export async function wipeUser(userId: ObjectId | string) {
  try {
    await Promise.all([
      clearAllSessions(userId.toString()),
      deleteAllCsrfTokens(userId.toString()),
    ]);
  } catch (error: any) {
    throw handleHttpError(error, "deleteUser service error.");
  }
}

/**
 * Deletes a user from the database and their refresh tokens.
 * TODO:
 */
export async function deleteUser(userId: ObjectId | string) {
  try {
    await Promise.all([
      User.deleteOne({ _id: userId }),
      clearAllSessions(userId.toString()),
    ]);
  } catch (error: any) {
    throw handleHttpError(error, "deleteUser service error.");
  }
}
