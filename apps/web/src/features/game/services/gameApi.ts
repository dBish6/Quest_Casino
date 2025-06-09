import type { GameStatus, LeaderboardType, TransactionType } from "@qc/constants";
import type { ViewUserProfileCredentials } from "@qc/typescript/typings/UserCredentials";

import type { HttpResponse, SocketResponse } from "@typings/ApiResponse";
import type { GetGamesResponseDto } from "@qc/typescript/dtos/GetGamesDto";
import type { GetQuestsResponseDto, GetUserQuestsProgressResponseDto } from "@qc/typescript/dtos/GetQuestsDto";
import type { GetBonusesResponseDto } from "@qc/typescript/dtos/GetBonusesDto";
import type DepositResponseDto from "@gameFeat/dtos/DepositResponseDto";
import type { PaymentHistoryResponseDto } from "@qc/typescript/dtos/PaymentHistoryDto";
import type { ManageProgressEventDto, ManageProgressResponseDto } from "@qc/typescript/dtos/ManageProgressEventDto";

import { GameEvent } from "@qc/constants";

import { logger } from "@qc/utils";
import { isFetchBaseQueryError } from "@utils/isFetchBaseQueryError";

import { injectEndpoints } from "@services/api";
import { getSocketInstance, emitAsPromise } from "@services/socket";
import apiEntry from "@services/getLocaleEntry";
import allow500ErrorsTransform from "@services/allow500ErrorsTransform";

import { UPDATE_USER_CREDENTIALS, UPDATE_USER_STATISTICS_PROGRESS } from "@authFeat/redux/authSlice";
import { ADD_TOAST, unexpectedErrorToast } from "@redux/toast/toastSlice";

const socket = getSocketInstance("game");

const gameApi = injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /**
     * Gets game content for navigation.
     * @request
     */
    getGames: builder.query<HttpResponse<GetGamesResponseDto>, { status?: GameStatus } | void>({
      query: (status) => ({
        url: "/games",
        method: "GET",
        ...(status && { params: status })
      }),
      onQueryStarted: (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.catch((error) => {
          if (isFetchBaseQueryError(error.error) && (error.error.status as number) >= 500)
            dispatch(
              unexpectedErrorToast(apiEntry("getGames").error.unexpected)
            );
        })
      },
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),

    /**
     * Gets the leaderboard content of the top 10 users by win rate or win total.
     * @request
     */
    getLeaderboard: builder.query<
      HttpResponse<{ users: ViewUserProfileCredentials[] }>,
      { type: LeaderboardType }
    >({
      query: (type) => ({
        url: "/games/leaderboard",
        method: "GET",
        params: type
      })
    }),

    /**
     * Gets all active quests if no params is provided. Can also get completed quests of a user by username.
     * @request
     */
    getQuests: builder.query<
      HttpResponse<GetQuestsResponseDto | GetUserQuestsProgressResponseDto>,
      { username?: string } | void
    >({
      query: (params) => ({
        url: "/games/quests",
        method: "GET",
        ...(params && { params })
      }),
      onQueryStarted: (_, { dispatch, queryFulfilled }) => {
        queryFulfilled.catch((error) => {
          if (isFetchBaseQueryError(error.error) && (error.error.status as number) === 404)
            dispatch(
              ADD_TOAST({
                title: apiEntry("getQuests").notFound,
                message: error.error.data!.ERROR,
                intent: "error",
                duration: 6500
              })
            );
        });
      }
    }),

    /**
     * Gets all active bonuses.
     * @request
     */
    getBonuses: builder.query<HttpResponse<GetBonusesResponseDto>, void>({
      query: () => ({
        url: "/games/bonuses",
        method: "GET"
      })
    }),

    /**
     * Increases balance and adds to payment history.
     * @request
     */
    transaction: builder.mutation<
      HttpResponse<DepositResponseDto>,
      { type: TransactionType; body: { amount: number } }
    >({
      query: ({ type, body }) => ({
        url: "/payment/transaction",
        method: "POST",
        body,
        params: { type }
      }),
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        const { data, meta } = await queryFulfilled;

        if (meta?.response?.ok) dispatch(UPDATE_USER_CREDENTIALS(data.user));
      },
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),

    /**
     * Gets the user's deposit and withdraw history.
     * @request
     */
    getPaymentHistory: builder.query<HttpResponse<PaymentHistoryResponseDto>, void>({
      query: () => ({
        url: "/payment/history",
        method: "GET"
      }),
      transformErrorResponse: (res, meta) => allow500ErrorsTransform(res, meta)
    }),

    /**
     * Manages user statistics progress for quests and bonuses.
     * @emitter
     */
    manageProgress: builder.mutation<
      SocketResponse<ManageProgressResponseDto>,
      Omit<ManageProgressEventDto, "type"> & { type: "bonus" } // Only bonus is used here. A quest will be used within a game.
    >({
      queryFn: async (data) => emitAsPromise(socket)(GameEvent.MANAGE_PROGRESS, data),
      onQueryStarted: async ({ type, action }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;

          if (data.status === "ok") {
            if (type === "bonus" && action === "activate") {
              const { success, ...title } = apiEntry("manageProgress");
              dispatch(
                ADD_TOAST({
                  title: title.activated,
                  message: data.message + success.message,
                  intent: "success",
                  duration: 6500
                })
              );
            }

            dispatch(UPDATE_USER_STATISTICS_PROGRESS(data.progress));
          }
        } catch (error: any) {
          const resError = error.error
          if (isFetchBaseQueryError(resError) && resError.data?.ERROR) {
            if (["bad request", "conflict"].includes(resError.status as string)) {
              dispatch(
                ADD_TOAST({
                  title:
                    resError.data.name === "MANAGE_PROGRESS_BONUS_LOCKED_NEW" ||
                    resError.data.name === "MANAGE_PROGRESS_BONUS_LOCKED_ACTIVE"
                      ? "Currently Active"
                      : resError.data.name === "MANAGE_PROGRESS_BONUS_USED"
                      ? "Already Used"
                      : undefined,
                  message: resError.data.ERROR,
                  intent: "error"
                })
              );
            }
          } else {
            logger.error("gameApi manageProgress error:\n", error.message);
          }
        }
      },
    })
  })
});

export const {
  endpoints: gameEndpoints,
  useLazyGetGamesQuery,
  useLazyGetLeaderboardQuery,
  useLazyGetQuestsQuery,
  useLazyGetBonusesQuery,
  useTransactionMutation,
  useLazyGetPaymentHistoryQuery,
  useManageProgressMutation
} = gameApi;

export default gameApi;
