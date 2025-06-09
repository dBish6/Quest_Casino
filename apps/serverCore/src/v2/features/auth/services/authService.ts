/**
 * General Auth Service
 *
 * Description:
 * Handles functionalities related to user authentication and management that can be for HTTP or Sockets.
 */

import type { ObjectId, PopulateOptions, Query, FilterQuery, UpdateQuery, QueryOptions, MongooseUpdateQueryOptions, UpdateWriteOpResult } from "mongoose";
import type { GetUserBy, UserDoc, UserDocFriends, UserDocStatistics, UserDocActivity, UserDocNotifications } from "@authFeat/typings/User";

import CLIENT_COMMON_EXCLUDE from "@constants/CLIENT_COMMON_EXCLUDE";

import { handleApiError, ApiError } from "@utils/handleError";

import { User, UserFriends, UserStatistics, UserActivity, UserNotifications } from "@authFeat/models";

export interface Identifier<TBy> {
  by: TBy;
  value: ObjectId | string;
  [key: string]: any;
}

type FriendsProjectionOpt = "pending" | "list";
type FriendsForClientOpt = boolean | FriendsProjectionOpt ;

/**
 * Type `UserCredentials` (minus the friends because they get initialized elsewhere).
 */
export const CLIENT_USER_FIELDS = `${CLIENT_COMMON_EXCLUDE} -google_id -email -password -limit_changes -friends -activity -notifications`;

/**
 * Type `MinUserCredentials`.
 */
export const MINIMUM_USER_FIELDS = "-_id member_id avatar_url legal_name username";

/**
 * Type `MinUserWithExtraCredentials`.
 */
export const MINIMUM_USER_FIELDS_EXTRA = `${MINIMUM_USER_FIELDS} country bio`

export const EXCLUDE_SUB_FIELDS = "-friends -statistics -activity -notifications"

export const USER_FRIENDS_POPULATE = (
  projection?: string,
  forClient?: FriendsForClientOpt
) =>
  ["pending", "list"].reduce((acc, type) => {
    const fields = type === "pending" ? MINIMUM_USER_FIELDS : MINIMUM_USER_FIELDS_EXTRA;

    if (projection === type || !projection)
      acc.push({
        path: `${type}.$*`,
        select:
          forClient === type || forClient === true
            ? fields
            : fields.replace("-_id ", "")
      });
    return acc;
  }, [] as PopulateOptions[]);

const USER_STATISTICS_PROGRESS_POPULATE = [
  {
    path: "progress.quest.$*.quest",
    select: "-_id cap"
  },
  {
    path: "progress.bonus.$*.bonus",
    select: "-_id cap"
  }
];

const USER_CORE_POPULATE_MAP = {
  settings: {
    path: "settings",
    populate: {
      path: "blocked_list.$*",
      select: MINIMUM_USER_FIELDS
    }
  },
  friends: {
    path: "friends",
    populate: USER_FRIENDS_POPULATE()
  },
  statistics: { path: "statistics" },
  activity: { path: "activity" },
  notifications: {
    path: "notifications",
    populate: {
      path: "friend_requests",
      select: MINIMUM_USER_FIELDS
    }
  }
};
/**
 * Populates specific fields on the `UserDoc` for the client or internal use.
 */
export function populateUserDoc<TUserDoc = UserDoc>(query: Query<any, UserDoc>) {
  return {
    full: (projection: string = ""): Query<TUserDoc | null, UserDoc> => {
      return query.populate(
        projection.split(" ").reduce((acc, fieldName) => {
          const subDoc = USER_CORE_POPULATE_MAP[fieldName as keyof typeof USER_CORE_POPULATE_MAP];
          if (subDoc) acc.push(subDoc);
          return acc;
        }, [] as any[])
      );
    },
    client: (email?: boolean): Query<TUserDoc | null, UserDoc> =>
      query.select(email === true ? CLIENT_USER_FIELDS.replace(" -email", "") : CLIENT_USER_FIELDS).populate([
        { ...USER_CORE_POPULATE_MAP.settings },
        {
          path: "statistics",
          select: CLIENT_COMMON_EXCLUDE,
          populate: USER_STATISTICS_PROGRESS_POPULATE
        }
      ]),
      min: (extra?: boolean): Query<TUserDoc | null, UserDoc> =>
        query.select(extra ? MINIMUM_USER_FIELDS_EXTRA : MINIMUM_USER_FIELDS)
  };
}

/**
 * Populates specific fields on the `UserDocFriends`.
 */
function populateUserFriendsDoc(
  query: Query<UserDocFriends | null, UserDocFriends>,
  forClient?: FriendsForClientOpt,
  projection?: FriendsProjectionOpt
) {
  return query
    .select(CLIENT_COMMON_EXCLUDE)
    .populate(USER_FRIENDS_POPULATE(projection, forClient));
}

/**
 * Gets all users or a random set of users from the database.
 * @param randomize (Optional) Serves as a flag and limit of users taken.
 */
export async function getUsers(forClient?: boolean, randomize?: number) {
  try {
    const query = User.find();

    if (randomize && !isNaN(randomize)) {
      const totalUsers = await User.countDocuments();
      query.skip(Math.floor(Math.random() * (totalUsers - randomize))).limit(randomize);
    }
    
    return await populateUserDoc<UserDoc[]>(query)[
      forClient ? (randomize ? "min" : "client") : "full"
    ](!!randomize as any);
  } catch (error: any) {
    throw handleApiError(error, "getUsers service error.");
  }
}

// NOTE: If I try to do Omit<QueryOptions<UserDoc>, "projection"> like I wanted, the options type then breaks and it has no of the mongoose options, I'm living with it.
/**
 * Gets a user from the database optionally for the client or internal use.
 * @param options.new (Optional) When `true` `findOneAndUpdate` is used else `updateOne` is used.
 * @param options.projection (Optional) Only for `findOneAndUpdate`; must only be a `string`, space-separated field names. 
 * You can also only get sub-document fields via `projection`.
 * @throws (Optional) `ApiError 404` if the document is not found.
 */
export async function getUser<
  TOptions extends QueryOptions<UserDoc> & {
    projection?: string;
    forClient?: boolean;
    throwDefault404?: boolean;
  }
>(
  identifier: Identifier<GetUserBy> & FilterQuery<UserDoc>,
  options: TOptions = {} as TOptions
): Promise<TOptions["throwDefault404"] extends true ? UserDoc : UserDoc | null> {
  const { by, value, ...filters } = identifier,
    { forClient, throwDefault404, projection: project, populate, ...restOpts } = options;

  try {
    let projection = project;
    if (!project) projection = EXCLUDE_SUB_FIELDS;

    let userQuery = User.findOne({ [by]: value, ...filters }, projection, restOpts);
    if (populate) userQuery.populate(populate as string);
    else populateUserDoc(userQuery)[forClient ? "client" : "full"](projection as any);

    const user = await userQuery.exec();
    if (throwDefault404 && !user) throw new ApiError("USER_NOT_FOUND_VAL", "general", 404, "not found");

    return user as UserDoc;
  } catch (error: any) {
    throw handleApiError(error, "getUser service error.");
  }
}

/**
 * Gets a friend document for a specific user from the database.
 * @param options.projection (Optional) A string of either `pending | list`.
 * @param options.forClient (Optional)
 *  Defaults to `true`. When set to `false`, the `_id` field is included.
 *  You can also provide `pending` or `list` to limit the selection to only the specified field, excluding `_id`.
 * @throws `ApiError 404` if the document is not found.
 */
export async function getUserFriends(
  userId: ObjectId | string,
  options: QueryOptions<UserDocFriends> & { projection?: FriendsProjectionOpt; forClient?: FriendsForClientOpt } = {}
) {
  const { forClient = true, ...restOpts } = options;

  try {
    const userFriends = await populateUserFriendsDoc(
      UserFriends.findById(userId, {}, restOpts),
      forClient,
      options.projection
    );
    if (!userFriends)
      throw new ApiError("USER_NOT_FOUND_FRIENDS_VAL", "auth", 404, "not found");

    return userFriends;
  } catch (error: any) {
    throw handleApiError(error, "getUserFriends service error.");
  }
}

/**
 * Updates any field in the user's `UserDoc` (base document).
 * @param options.new (Optional) When `true` `findOneAndUpdate` is used else `updateOne` is used.
 * @param options.projection (Optional) Only for `findOneAndUpdate`; must only be a `string`, space-separated field names.
 * You can also only get sub-document fields via `projection`.
 * @throws `ApiError 404` if the document is not found for `findOneAndUpdate`.
 */
export async function updateUserCredentials<
  TOptions extends { new?: boolean; forClient?: boolean }
>(
  identifier: Identifier<GetUserBy> & FilterQuery<UserDoc>,
  update: UpdateQuery<UserDoc>,
  options: TOptions & (TOptions["new"] extends true ? QueryOptions<UserDoc> : MongooseUpdateQueryOptions) = {} as any
): Promise<TOptions["new"] extends true ? UserDoc : UpdateWriteOpResult> {
  const { by, value, ...filters } = identifier,
    { forClient, projection, populate, ...restOpts } = options;
  
  try {
    if (options.new) {
      if (!projection) 
        (restOpts as QueryOptions<UserDoc>).projection = EXCLUDE_SUB_FIELDS;

      const userQuery = User.findOneAndUpdate({ [by]: value, ...filters }, update, restOpts);
      if (projection) userQuery.select(projection);
      if (populate) userQuery.populate(populate as string);
      else populateUserDoc(userQuery)[forClient ? "client" : "full"](projection);

      const user = await userQuery.exec();
      if (!user) {
        if (filters) {
          // Checks if the reason was because of the identifier value.
          const exists = await User.exists({ [by]: value });
          if (!exists) throw new ApiError("USER_NOT_FOUND", "general", 404, "not found");

          return user as any;
        } else {
          throw new ApiError("USER_NOT_FOUND", "general", 404, "not found");
        }
      }

      return user as any;
    } else {
      return await User.updateOne({ [by]: value }, update, restOpts) as any;
    }
  } catch (error: any) {
    throw handleApiError(error, "updateUserCredentials service error.");
  }
}

/**
 * Updates any field in the user's friends document.
 * @param options.projection (Optional) A string of either `pending | list`.
 * @param options.forClient (Optional)
 *  Defaults to `true`. When set to `false`, the `_id` field is included.
 *  You can also provide `pending` or `list` to limit the selection to only the specified field, excluding `_id`.
 * @param options.new (Optional) When `true` `findOneAndUpdate` is used else `updateOne` is used.
 * @throws `ApiError 404` if the document is not found.
 */
export async function updateUserFriends<
  TOptions extends {
    projection?: FriendsProjectionOpt;
    forClient?: FriendsForClientOpt;
    new?: boolean;
  }
>(
  identifier: Identifier<"_id">,
  update: UpdateQuery<UserDocFriends>,
  options: TOptions & (TOptions["new"] extends true ? QueryOptions<UserDocFriends> : MongooseUpdateQueryOptions) = {} as any
): Promise<TOptions["new"] extends true ? UserDocFriends : UpdateWriteOpResult> {
  const { by, value } = identifier,
    { forClient = true, ...restOpts } = options;

  try {
    if (options?.new) {
      let userFriends = await populateUserFriendsDoc(
        UserFriends.findOneAndUpdate({ [by]: value }, update, restOpts),
        forClient,
        restOpts.projection
      );
      if (!userFriends) throw new ApiError("USER_NOT_FOUND_FRIENDS", "auth", 404, "not found");

      return userFriends as any;
    } else {
      return await UserFriends.updateOne({ [by]: value }, update, restOpts as MongooseUpdateQueryOptions) as any;
    }
  } catch (error: any) {
    throw handleApiError(error, "updateUserFriends service error.");
  }
}

/**
 * Updates any field in the user's statistics document.
 * @param options.new (Optional) When `true` `findOneAndUpdate` is used else `updateOne` is used.
 * @param options.projection (Optional) Only for `findOneAndUpdate`; must only be a `string`, space-separated field names.
 * @throws `ApiError 404` if the document is not found.
 */
export async function updateUserStatistics<
  TOptions extends { new?: boolean; forClient?: boolean; }
>(
  identifier: Identifier<"_id">,
  update: UpdateQuery<UserDocStatistics>,
  options: TOptions & (TOptions["new"] extends true ? QueryOptions<UserDocStatistics> : MongooseUpdateQueryOptions) = {} as any
): Promise<TOptions["new"] extends true ? UserDocStatistics : UpdateWriteOpResult> {
  const { by, value } = identifier,
    { forClient, projection, populate, ...restOpts } = options;

  try {
    if (options?.new) {
      const userStatisticsQuery = UserStatistics.findOneAndUpdate({ [by]: value }, update, restOpts);
      if (projection) userStatisticsQuery.select(projection);
      if (populate) userStatisticsQuery.populate(populate as string);
      else if (forClient && (projection.includes("progress") || !projection))
        userStatisticsQuery.populate(USER_STATISTICS_PROGRESS_POPULATE);

      const userStatistics = await userStatisticsQuery.exec();
      if (!userStatistics) throw new ApiError("USER_NOT_FOUND_STATISTICS", "auth", 404, "not found");

      return userStatistics as any;
    } else {
      return await UserStatistics.updateOne({ [by]: value }, update, options as MongooseUpdateQueryOptions) as any;
    }
  } catch (error: any) {
    throw handleApiError(error, "updateUserStatistics service error.");
  }
}

/**
 * Updates any field in the user's activity document.
 * @param options.new (Optional) When `true` `findOneAndUpdate` is used else `updateOne` is used.
 * @throws `ApiError 404` if the document is not found.
 */
export async function updateUserActivity<
  TOptions extends { new?: boolean }
>(
  identifier: Identifier<"_id">,
  update: UpdateQuery<UserDocActivity>,
  options: TOptions & (TOptions["new"] extends true ? QueryOptions<UserDocActivity> : MongooseUpdateQueryOptions) = {} as any
): Promise<TOptions["new"] extends true ? UserDocActivity : UpdateWriteOpResult> {
  const { by, value } = identifier,
    { projection, ...restOpts } = options;
  
  try {
    if (options?.new) {
      const userActivityQuery = UserActivity.findOneAndUpdate({ [by]: value }, update, restOpts);
      if (projection) userActivityQuery.select(projection);

      const userActivity = await userActivityQuery.exec();
      if (!userActivity) throw new ApiError("USER_NOT_FOUND_ACTIVITY", "auth", 404, "not found");

      return userActivity as any;
    } else {
      return await UserActivity.updateOne({ [by]: value }, update, options as MongooseUpdateQueryOptions) as any;
    }
  } catch (error: any) {
    throw handleApiError(error, "updateUserActivity service error.");
  }
}

/**
 * Updates any field in the user's notifications document.
 * @param options.new (Optional) When `true` `findOneAndUpdate` is used else `updateOne` is used.
 * @throws `ApiError 404` if the document is not found.
 */
export async function updateUserNotifications<
  TOptions extends { new?: boolean }
>(
  identifier: Identifier<"_id">,
  update: UpdateQuery<UserDocNotifications>,
  options: TOptions & (TOptions["new"] extends true ? QueryOptions<UserDocNotifications> : MongooseUpdateQueryOptions) = {} as any
): Promise<TOptions["new"] extends true ? UserDocNotifications : UpdateWriteOpResult> {
  const { by, value } = identifier,
    { projection, ...restOpts } = options;

  try {
    if (options?.new) {
      const userNotificationsQuery = UserNotifications.findOneAndUpdate({ [by]: value }, update, restOpts);
      if (projection) userNotificationsQuery.select(projection);

      const userNotifications = await userNotificationsQuery.exec();
      if (!userNotifications)
        throw new ApiError("USER_NOT_FOUND_NOTIFS", "auth", 404, "not found");

      return userNotifications as any;
    } else {
      return await UserNotifications.updateOne({ [by]: value }, update, options as MongooseUpdateQueryOptions) as any;
    }
  } catch (error: any) {
    throw handleApiError(error, "updateUserNotifications service error.");
  }
}
