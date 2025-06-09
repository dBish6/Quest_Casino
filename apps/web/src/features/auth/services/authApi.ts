import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import type { RootState } from "@redux/store";
import type { UserCredentials, MinUserCredentials, UserProfileCredentials, ViewUserProfileCredentials, ActivityStatuses } from "@qc/typescript/typings/UserCredentials";

import type { HttpResponse, SocketResponse } from "@typings/ApiResponse";
import type RegisterBodyDto from "@qc/typescript/dtos/RegisterBodyDto";
import type { LoginGoogleResponseDto, LoginResponseDto } from "@authFeat/dtos/LoginResponseDto";
import type { LoginBodyDto, LoginGoogleBodyDto } from "@qc/typescript/dtos/LoginBodyDto";
import type { GetNotificationsResponseDto, DeleteNotificationsBodyDto, Notification } from "@qc/typescript/dtos/NotificationsDto"
import type { UpdateProfileBodyDto, UpdateProfileResponseDto, UpdateUserFavouritesBodyDto, SendConfirmPasswordEmailBodyDto } from "@qc/typescript/dtos/UpdateUserDto";
import type { LogoutResponseDto } from "@authFeat/dtos/LogoutResponseDto";
import type LogoutBodyDto from "@qc/typescript/dtos/LogoutBodyDto";
import type { ManageFriendRequestEventDto } from "@qc/typescript/dtos/ManageFriendEventDto";
import type FriendActivityEventDto from "@authFeat/dtos/FriendActivityEventDto";
import type FriendsUpdateEventDto from "@authFeat/dtos/FriendsUpdateEventDto";

import { type AvailableLocales, AuthEvent } from "@qc/constants";
import { STRIP_BRACKETS_AND_TEXT } from "@constants/LOCALE_STRIP_MARKERS";
import { ANIMATION_DURATION, ModalQueryKey } from "@components/modals";

import { logger } from "@qc/utils";
import { history } from "@utils/History";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import { injectEndpoints, API_BASE_URL, prepareHeadersAndOptions } from "@services/api";
import { getSocketInstance, emitAsPromise } from "@services/socket";
import apiEntry from "@services/getLocaleEntry";
import allow500ErrorsTransform from "@services/allow500ErrorsTransform";
import handleLogout from "./handleLogout";
import handleSendVerifyEmail from "./handleSendVerifyEmail";

import { UPDATE_USER_CREDENTIALS, SET_USER_FAVOURITES, UPDATE_USER_FRIENDS, REMOVE_USER_FRIEND, UPDATE_USER_FRIEND_IN_LIST, INITIALIZE_SESSION, SET_USER_SETTINGS } from "@authFeat/redux/authSlice";
import { ADD_TOAST, unexpectedErrorToast } from "@redux/toast/toastSlice";

const socket = getSocketInstance("auth");
export const authSocketListeners = {
  friendsUpdate: "friendsUpdate",
  friendActivity: "friendActivity",
  newNotification: "newNotification",
} as const;

const authApi = injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Creates a new user.
     * @request
     */
    register: builder.mutation<HttpResponse, RegisterBodyDto>({
      query: (user) => ({
        url: "/auth/register",
        method: "POST",
        body: user
      }),
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),

    /**
     * Creates a user login session.
     * @request
     */
    login: builder.mutation<
      HttpResponse<LoginResponseDto>,
      LoginBodyDto
    >({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data, meta } = await queryFulfilled;

        if (meta?.response?.ok) {
          setTimeout(() => {
            handleLoginSuccess(
              dispatch,
              data,
              meta.response!.headers.get("x-xsrf-token")!
            );
          }, ANIMATION_DURATION / 2);
        }
      },
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),
    /**
     * Creates a user login session via Google.
     * @request
     */
    loginGoogle: builder.mutation<
      HttpResponse<LoginGoogleResponseDto>,
      LoginGoogleBodyDto
    >({
      query: (credentials) => ({
        url: "/auth/login/google",
        method: "POST",
        body: credentials
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const params = new URLSearchParams(window.location.search);
        let modalParam = "";

        try {
          history.push(localStorage.getItem("qc:prev_path") || "/about", { replace: true });

          const { data, meta } = await queryFulfilled;

          if (meta?.response?.ok) {
            modalParam = params.get(ModalQueryKey.LOGIN_MODAL) ? ModalQueryKey.LOGIN_MODAL
              : params.get(ModalQueryKey.REGISTER_MODAL) ? ModalQueryKey.REGISTER_MODAL
              : ""; // Removes the param only on success.

            handleLoginSuccess(
              dispatch,
              data,
              meta.response!.headers.get("x-xsrf-token")!
            );
          }
        } finally {
          // Removes the google params.
          for (const key of ["state", "code", "scope", "authuser", "prompt", modalParam]) {
            if (params.has(key)) params.delete(key);
          }

          const path = localStorage.getItem("qc:prev_path") || "/about";
          history.push(
            params.size ? `${path}?${params.toString()}` : { pathname: path, search: null },
            { replace: true }
          );
          localStorage.removeItem("qc:prev_path");
        }
      },
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),

    /**
     * Finalizes and verifies the user.
     * @request
     */
    emailVerify: builder.mutation<
      HttpResponse<{ user: UserCredentials }>,
      { verification_token: string }
    >({
      query: (body) => ({
        url: "/auth/email-verify",
        method: "POST",
        body
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data, meta } = await queryFulfilled;

        if (meta?.response?.ok) {
          dispatch(UPDATE_USER_CREDENTIALS(data.user));
          dispatch(ADD_TOAST({ message: data.message, intent: "success" }));
        }
      }
    }),
    /**
     * Sends the email verification email.
     * @request
     */
    sendVerifyEmail: builder.mutation<HttpResponse, void>({
      query: () => ({
        url: "/auth/email-verify/send",
        method: "POST"
      })
    }),

    /**
     * Gets all users by search query (`username`) or a random set of set of users based on `count`.
     * @request
     */
    getUsers: builder.query<
      HttpResponse<{
        users: (MinUserCredentials[] & { bio?: string }) | UserCredentials[];
      }>,
      { username?: string; count?: number }
    >({
      queryFn: async (query, { getState }, _, baseQuery) => {
        const { username, count } = query;

        if (
          username &&
          !(getState() as RootState).auth.user.credentials?.email_verified
        )
          return {
            error: {
              data: {
                allow: true,
                ERROR: apiEntry("getUsers").error.verifiedRequired
              },
              status: 401
            }
          };

        const res = (await baseQuery({
          url: "/auth/users",
          method: "GET",
          params: { ...(username && { username }), ...(count && { count }) }
        })) as any;

        return res.error
          ? {
              error: res.meta?.request.url.includes("?", -1)
                ? allow500ErrorsTransform(res.error!, res.meta)
                : res.error
            }
          : res;
      }
    }),

    /**
     * Gets the current user or just their notifications.
     * @request
     */
    getUser: builder.query<
      HttpResponse<{ user: UserCredentials | GetNotificationsResponseDto }>,
      { notifications: boolean } | void
    >({
      query: (param) => ({
        url: "/auth/user",
        method: "GET",
        ...(param?.notifications && {
          params: { notifications: param.notifications }
        })
      }),
      providesTags: ["Notification"],
      onQueryStarted: (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.catch((error) => {
          if (isFetchBaseQueryError(error.error) && error.error.status === 404)
            dispatch(
              unexpectedErrorToast(
                apiEntry("getUser").error.notFound,
                false
              )
            );
        });
      }
    }),

    /**
     * Gets the profile data for the user's private profile page or get a user's public profile by `username`.
     *
     * Note: The profile data for the private profile page isn't the user credentials, this route gives us
     * 'extra' user credentials that we don't store on the client.
     * @request
     */
    getUserProfile: builder.query<
      HttpResponse<{
        // ViewUserProfileCredentials when it's not requesting the current user (we get a profile by username).
        user:
          | UserProfileCredentials
          | ViewUserProfileCredentials;
      }>,
      { username: string } | void
    >({
      query: (param) => ({
        url: "/auth/user/profile",
        method: "GET",
        ...(param?.username && { params: { username: param.username } })
      }),
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),
    /**
     * Updates their user profile; 'facing' credentials.
     * @request
     */
    updateProfile: builder.mutation<
      HttpResponse<UpdateProfileResponseDto>,
      UpdateProfileBodyDto & { keepalive?: boolean; allow500?: boolean }
    >({
      queryFn: async (
        { keepalive, allow500 = true, ...body },
        { getState, dispatch, signal },
        _,
        baseQuery
      ) => {
        if (keepalive) {
          const res = await fetch(`${API_BASE_URL}/auth/user`, {
              method: "PATCH",
              body: JSON.stringify(body),
              ...prepareHeadersAndOptions({ state: getState() as RootState }),
              keepalive: true,
              signal
            }),
            data: HttpResponse<UpdateProfileResponseDto> = await res.json();

          if (!res.ok) {
            dispatch(
              unexpectedErrorToast(
                apiEntry("updateProfile").error.settingsUnexpected,
                false
              )
            );

            return { error: allow500ErrorsTransform(data, res) };
          }

          return { data, meta: { response: res } };
        } else {
          const res = (await baseQuery({
            url: "/auth/user",
            method: "PATCH",
            body
          })) as any;
  
          return res.error
            ? { error: allow500 ? allow500ErrorsTransform(res.error, res.meta) : res.error }
            : res;
        }
      },
      onQueryStarted: async ({ allow500 = true, settings }, { dispatch, queryFulfilled }) => {
        const { success, ...title } = apiEntry("updateProfile");

        try {
          const { data, meta } = await queryFulfilled;

          if (meta?.response?.ok) {
            const { email, ...rest } = data.user,
              isViewProfileUpdate = allow500 === false && settings?.blocked_list.length === 1; // Update happened when viewing a user's profile.

            if (settings) {
              dispatch(SET_USER_SETTINGS(rest.settings as UserCredentials["settings"]));

              if (isViewProfileUpdate) {
                if (settings.blocked_list[0].op === "add") {
                  dispatch(
                    ADD_TOAST({
                      title: title.blocked,
                      message: success.blocked,
                      intent: "success",
                      duration: 6500
                    })
                  );
                  if (data.unfriended) {
                    dispatch(
                      ADD_TOAST({
                        title: title.blocked,
                        message: success.blockedFriend,
                        intent: "info"
                      })
                    );
                  }
                } else {
                  dispatch(
                    ADD_TOAST({
                      title: title.unblocked,
                      message: success.unblocked,
                      intent: "success",
                      duration: 6500
                    })
                  );
                }
              }
            } else {
              dispatch(UPDATE_USER_CREDENTIALS(rest));
            }

            // Updated their email.
            if (data.refreshed)
              dispatch(
                ADD_TOAST({
                  title: title.email,
                  message: success.email + data.refreshed,
                  intent: "info"
                })
              );
          }
        } catch (err: any) {
          const resError = err.error;
          if (isFetchBaseQueryError(resError) && resError.data?.ERROR) {
            if (resError.status === 404 && resError.data.name === "USER_BLOCKED_NOT_FOUND") {
              dispatch(
                ADD_TOAST({
                  title: title.cantBlock,
                  message: resError.data.ERROR,
                  intent: "error"
                })
              );
            } else if (resError.status === 449) {
              dispatch(
                ADD_TOAST({
                  title: title.tooManyAttempts,
                  message: resError.data.ERROR,
                  intent: "error"
                })
              );
            }
          } else {
            logger.error("authApi updateProfile error:\n", err.message);
          }
        }
      }
    }),

    /**
     * Add or delete the user's favourites.
     * @request
     */
    updateUserFavourites: builder.mutation<
      HttpResponse<{ favourites: UserCredentials["favourites"] }>,
      UpdateUserFavouritesBodyDto
    >({
      queryFn: async (query, { getState, dispatch, signal }) => {
        const res = await fetch(`${API_BASE_URL}/auth/user/favourites`, {
            method: "PATCH",
            body: JSON.stringify({ favourites: query.favourites }),
            ...prepareHeadersAndOptions({ state: getState() as RootState }),
            keepalive: true,
            signal
          }),
          data: HttpResponse<{ favourites: UserCredentials["favourites"] }> =
            await res.json();

        if (!res.ok) {
          dispatch(
            unexpectedErrorToast(
              apiEntry("updateUserFavourites").error.unexpected
            )
          );

          return { error: allow500ErrorsTransform(data, res) };
        }

        if (data.favourites) dispatch(SET_USER_FAVOURITES(data.favourites));
        return { data };
      }
    }),

    /**
     * Updates the user's password.
     * @request
     */
    resetPassword: builder.mutation<
      HttpResponse<LogoutResponseDto>,
      { verification_token: string }
    >({
      query: (body) => ({
        url: "/auth/user/reset-password",
        method: "PATCH",
        body
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        try {
          const { data, meta } = await queryFulfilled;

          if (meta?.response?.ok) {
            dispatch(ADD_TOAST({ message: data.message, intent: "success" }));
            handleLogout(dispatch, socket, data.oState);
          }
        } catch (err: any) {
          const resError = err.error;
          if (isFetchBaseQueryError(resError) && resError.data?.ERROR) {
            const { error, ...title } = apiEntry("resetPassword");

            if ([401, 403].includes(resError.status as number)) {
              if (resError.data.name.includes("EXPIRED")) {
                dispatch(
                  ADD_TOAST({
                    title: title.expired,
                    message: error.tokenExpired,
                    intent: "error"
                  })
                );
              } else {
                dispatch(
                  ADD_TOAST({
                    message:
                      // @ts-ignore
                      window.__LOCALE_DATA__.general[(resError.status === 401 ? "unauthorized" : "forbidden")],
                    intent: "error"
                  })
                );
              }
            } else if (resError.data.name === "RESET_PASSWORD_EXPIRED") {
              dispatch(
                ADD_TOAST({
                  title: title.expired,
                  message: resError.data.ERROR,
                  intent: "error"
                })
              );
            } else if (resError.status === 429) {
              dispatch(
                ADD_TOAST({
                  title: title.tooManyAttempts,
                  message: resError.data.ERROR,
                  intent: "error"
                })
              );
            }
          } else {
            logger.error("authApi resetPassword error:\n", err.message);
          }
        }
      }
    }),

    /**
     * Sends password reset confirmation email.
     * @request
     */
    sendConfirmPasswordEmail: builder.mutation<
      HttpResponse,
      { param?: "forgot" } & SendConfirmPasswordEmailBodyDto
    >({
      query: ({ param = "", ...body }) => ({
        url: `/auth/user/reset-password${"/" + param}/confirm`,
        method: "POST",
        body
      }),
      onQueryStarted: async ({ param }, { dispatch, queryFulfilled }) => {
        const { data, meta } = await queryFulfilled;

        if (meta?.response?.ok && !param)
          dispatch(
            ADD_TOAST({
              title: apiEntry("sendConfirmPasswordEmail").pending,
              message: data.message,
              intent: "info"
            })
          );
      },
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),

    /**
     * Sends forgot password email.
     * @request
     */
    sendForgotPasswordEmail: builder.mutation<HttpResponse, { email: string }>({
      query: (body) => ({
        url: "/auth/user/reset-password/forgot",
        method: "POST",
        body
      }),
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),

    /**
     * Cancels password reset confirmation.
     * @request
     */
    revokePasswordReset: builder.mutation<HttpResponse, void>({
      query: () => ({
        url: "/auth/user/reset-password/revoke",
        method: "DELETE"
      })
    }),

    /**
     * Clears all user sessions and other tokens.
     * @request
     * // TODO: Not used.
     */
    wipeUser: builder.mutation<HttpResponse, void>({
      query: () => ({
        url: "/auth/user/wipe",
        method: "POST"
      })
    }),

    /**
     * Deletes the current user from existence.
     * @request
     * // TODO: Not used.
     */
    deleteUser: builder.mutation<HttpResponse, void>({
      query: () => ({
        url: "/auth/user",
        method: "DELETE"
      })
    }),

    /**
     * Deletes the given notifications from the current user.
     * @request
     */
    deleteUserNotifications: builder.mutation<
      HttpResponse<{ user: { notifications: Notification[] } }>,
      DeleteNotificationsBodyDto
    >({
      query: (body) => ({
        url: "/auth/user/notifications",
        method: "DELETE",
        body
      })
    }),

    /**
     * Refreshes the user session (used on socket error).
     * @request
     */
    refresh: builder.mutation<HttpResponse, { username: string }>({
      query: (username) => ({
        url: "/auth/user/refresh",
        method: "POST",
        body: username
      })
    }),

    /**
     * Clears the user session.
     * @request
     */
    logout: builder.mutation<HttpResponse<LogoutResponseDto>, LogoutBodyDto>({
      query: (body) => ({
        url: "/auth/user/logout",
        method: "POST",
        body
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data, meta } = await queryFulfilled;

        if (meta?.response?.ok) handleLogout(dispatch, socket, data.oState);
      }
    }),

    /**
     * Initializes all friend rooms and friend activity statuses.
     * @emitter
     */
    initializeFriends: builder.mutation<
      SocketResponse<{ friends: UserCredentials["friends"] }>,
      { member_id: string }
    >({
      queryFn: async (data) => emitAsPromise(socket)(AuthEvent.INITIALIZE_FRIENDS, data)
    }),

    /**
     * Manages friend requests including sending, accepting, and declining.
     * Also, checks if the user is verified and avoids duplicate requests.
     * @emitter
     */
    manageFriendRequest: builder.mutation<
      SocketResponse<{ pending_friends: UserCredentials["friends"]["pending"] }>,
      ManageFriendRequestEventDto & {
        /** When true, toasts are used and 500 errors are allowed. */
        toasts?: boolean; 
      }
    >({
      queryFn: async ({ toasts, ...data }, { getState, dispatch }) => {
        const user = (getState() as RootState).auth.user.credentials;

        const localeApi = apiEntry(),
          { error, ...title } = localeApi.manageFriendRequest;

        if (!user?.email_verified) {
          const errorMsg = error.unauthorized;

          if (toasts)
            dispatch(
              ADD_TOAST({
                title: title.unauthorized,
                message: errorMsg,
                intent: "error",
                options: {
                  inject: {
                    btnOnClick: () => handleSendVerifyEmail(dispatch),
                    localeMarker: true
                  }
                }
              })
            );
          return {
            error: {
              allow: true,
              data: {
                ERROR: errorMsg.endsWith(".")
                  ? error.unauthorized.replace(STRIP_BRACKETS_AND_TEXT, "").slice(0, -1)
                  : error.unauthorized.replace(STRIP_BRACKETS_AND_TEXT, "")
              },
              status: "unauthorized"
            }
          };
        } else if (
          [user.friends.pending, user.friends.list].some(
            (friend) => friend[data.friend.member_id as any]?.username === data.friend.username
          )
        ) {
          if (toasts)
            dispatch(
              ADD_TOAST({
                title: title.already,
                message: error.already,
                intent: "error",
                duration: 6500
              })
            );
          return {
            error: { data: { ERROR: error.already }, status: "bad request" }
          };
        } else if (
          user.settings.blocked_list[data.friend.member_id]?.username === data.friend.username 
        ) {
          if (toasts)
            dispatch(
              ADD_TOAST({
                title: title.blocked,
                message: error.blocked,
                intent: "error",
                duration: 6500
              })
            );
          return {
            error: { data: { ERROR: error.blocked }, status: "bad request" }
          };
        }

        const res = await emitAsPromise(socket)(AuthEvent.MANAGE_FRIEND_REQUEST, data);

        return res.error
          ? {
              error: {
                ...res.error,
                data: {
                  ...(!toasts
                    ? allow500ErrorsTransform(res.error!, res.meta).data
                    : res.error.data),
                  ERROR:
                    res.error.data?.name === "USER_NOT_FOUND_SYSTEM" ||
                    res.error.status === "conflict"
                      ? res.error.data.ERROR
                      : localeApi.error.unexpected
                }
              }
            }
          : res;
      },
      onQueryStarted: async ({ toasts, action_type }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;

          logger.debug("MANAGE FRIEND", data);

          if (
            data.status === "ok" &&
            action_type === "request" &&
            data.pending_friends
          ) {
            dispatch(UPDATE_USER_FRIENDS({ pending: data.pending_friends }));
            if (toasts)
              dispatch(
                ADD_TOAST({
                  message: data.message,
                  intent: "success",
                  duration: 6500
                })
              );
          }
        } catch (err: any) {
          const resError = err.error;
          if (isFetchBaseQueryError(resError) && resError.data?.ERROR && toasts) {
            const { error, ...title } = apiEntry("manageFriendRequest");

            if (resError.status !== "internal error") {
              if (resError.status === "not found") {
                dispatch(
                  ADD_TOAST({
                    title: title.notFound,
                    message: resError.data.ERROR,
                    intent: "error"
                  })
                );
              } else if (resError.data.name === "MANAGE_FRIEND_NOT_VERIFIED") {
                dispatch(
                  ADD_TOAST({
                    title: title.cannotSend,
                    message: resError.data.ERROR,
                    intent: "error"
                  })
                );
              } else if (resError.data.name === "MAX_FRIENDS") {
                dispatch(
                  ADD_TOAST({
                    title: title.maxReached,
                    message: resError.data.ERROR + error.maxReached,
                    intent: "error"
                  })
                );
              }
            }
          } else {
            logger.error("authApi manageFriendRequest error:\n", err.message);
          }
        }
      }
    }),

    /**
     * Deletes a friend from the user's friend list.
     * @emitter
     */
    unfriend: builder.mutation<
      SocketResponse,
      { username: string, member_id: string }
    >({
      queryFn: async ({ username: _, ...data }) => emitAsPromise(socket)(AuthEvent.UNFRIEND, data),
      onQueryStarted: ({ username }, { dispatch, queryFulfilled }) => {
        queryFulfilled.then(({ data }) => {
          if (data.status === "ok")
            dispatch(
              ADD_TOAST({
                message: apiEntry("unfriend").success.message.replace("{{username}}", username),
                intent: "success",
                duration: 6500
              })
            );
        });
      }
    }),

    /**
     * Sends the user's new activity status.
     * @emitter
     */
    userActivity: builder.mutation<
      SocketResponse,
      { status: ActivityStatuses }
    >({
      queryFn: async (data) => emitAsPromise(socket)(AuthEvent.USER_ACTIVITY, data)
    }),

    /**
     * Changes the locale for all socket instances.
     * @emitter
     */
    localeChange: builder.mutation<
      SocketResponse,
      { locale: AvailableLocales }
    >({
      queryFn: async (data) => emitAsPromise(socket)(AuthEvent.LOCALE_CHANGE, data)
    }),

    /**
     * Receives new friends to be added or removed for the user's pending or friends list.
     * @listener
     */
    [authSocketListeners.friendsUpdate]: builder.mutation<
      { resourcesLoaded?: boolean },
      { resourcesLoaded?: boolean }
    >({
      queryFn: (loadedObj) => ({ data: loadedObj }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;

        if (data.resourcesLoaded) {
          logger.debug("friendsUpdate listener initialized.");

          socket.on(AuthEvent.FRIENDS_UPDATE, (friends: FriendsUpdateEventDto) => {
              try {
                logger.debug("FRIEND UPDATE", friends);

                if ("remove" in friends) dispatch(REMOVE_USER_FRIEND(friends.remove));
                
                if (
                  "update" in friends &&
                  ("list" in friends.update || "pending" in friends.update)
                ) {
                  dispatch(UPDATE_USER_FRIENDS(friends.update));
                } else {
                  logger.error("authApi friendsUpdate error:\n", "Received incorrect friends object.");
                }
              } catch (error: any) {
                history.push("/error-500");
                logger.error("authApi friendsUpdate error:\n", error.message);
              }
            }
          );
        }
      }
    }),

    /**
     * Receives status updates from friends in the user's friends list.
     * @listener
     */
    [authSocketListeners.friendActivity]: builder.mutation<
      { resourcesLoaded?: boolean },
      { resourcesLoaded?: boolean }
    >({
      queryFn: (loadedObj) => ({ data: loadedObj }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;

        if (data.resourcesLoaded) {
          logger.debug("friendActivity listener initialized.");

          socket.on(AuthEvent.FRIEND_ACTIVITY, ({ member_id, status }: FriendActivityEventDto) => {
              try {
                logger.debug("FRIEND ACTIVITY", { member_id, status });

                dispatch(
                  UPDATE_USER_FRIEND_IN_LIST({
                    memberId: member_id,
                    update: { activity: { status } }
                  })
                );
              } catch (error: any) {
                history.push("/error-500");
                logger.error("authApi friendActivity error:\n", error.message);
              }
            }
          );
        }
      }
    }),

    /**
     * All incoming notifications from the server (friend requests, system messages, news, etc).
     * @listener
     */
    [authSocketListeners.newNotification]: builder.mutation<
      { resourcesLoaded?: boolean },
      { resourcesLoaded?: boolean }
    >({
      queryFn: (loadedObj) => ({ data: loadedObj }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;

        if (data.resourcesLoaded) {
          logger.debug("newNotification listener initialized.");

          socket.on(AuthEvent.NEW_NOTIFICATION, (data: { notification: Notification }) => {
              try {
                logger.debug("NEW NOTIFICATION", data);
                const { type: _, title, message, link } = data.notification;

                dispatch(
                  ADD_TOAST({
                    title,
                    message,
                    intent: "info",
                    options: {
                      ...(link && {
                        inject: {
                          linkTo: link.to,
                          localeMarker: link.localeMarker
                        }
                      })
                    }
                  })
                );
                dispatch(authApi.util.invalidateTags(["Notification"]));
              } catch (error: any) {
                history.push("/error-500");
                logger.error("authApi newNotification error:\n", error.message);
              }
            }
          );
        }
      }
    })
  })
});

function handleLoginSuccess(
  dispatch: ThunkDispatch<any, any, UnknownAction>,
  data: HttpResponse<LoginResponseDto | LoginGoogleResponseDto>,
  token: string
) {
  const localeApi = apiEntry();

  try {
    dispatch(INITIALIZE_SESSION({ credentials: data.user, csrf: token }));

    dispatch(
      ADD_TOAST({
        ...(data.user.email_verified
          ? { title: localeApi.welcome, duration: 6500 }
          : { title: localeApi.welcomeIssue }),
        message: data.message,
        intent: "success",
        options: {
          inject: {
            btnOnClick: () => handleSendVerifyEmail(dispatch),
            localeMarker: true
          }
        }
      })
    );

    if ((data as LoginGoogleResponseDto).google_new)
      dispatch(
        ADD_TOAST({
          title: localeApi.countryRequired,
          message: (data as LoginGoogleResponseDto).google_new!,
          intent: "info"
        })
      );
  } catch (error: any) {
    logger.error("authApi handleLoginSuccess error:\n", error.message);
    dispatch(
      unexpectedErrorToast(localeApi.error.unexpectedLogin)
    );
  }
}

export const {
  endpoints: authEndpoints,
  useRegisterMutation,
  useLoginMutation,
  useLoginGoogleMutation,
  useEmailVerifyMutation,
  // useSendVerifyEmailMutation,
  useLazyGetUsersQuery,
  useLazyGetUserQuery,
  useLazyGetUserProfileQuery,
  useUpdateProfileMutation,
  useUpdateUserFavouritesMutation,
  useResetPasswordMutation,
  useSendConfirmPasswordEmailMutation,
  useSendForgotPasswordEmailMutation,
  // useWipeUserMutation,
  // useDeleteUserMutation,
  useDeleteUserNotificationsMutation,
  useLogoutMutation,
  useInitializeFriendsMutation,
  useManageFriendRequestMutation,
  useUnfriendMutation,
  useUserActivityMutation,
  useLocaleChangeMutation
} = authApi;

export default authApi;

export type LoginGoogleTriggerType = ReturnType<typeof useLoginGoogleMutation>[0];
