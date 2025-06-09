/**
 * Game Service
 *
 * Description:
 * Handles HTTP-related functionalities related to games; quests, bonuses, leaderboard and game lists.
 */

import type { ObjectId, QueryOptions } from "mongoose";
import type { GameStatus, GameQuestStatus, GameBonusStatus } from "@qc/constants";
import type { GameQuestDoc } from "@gameFeat/typings/Game";
import type { UserDoc } from "@authFeat/typings/User";

import CLIENT_COMMON_EXCLUDE from "@constants/CLIENT_COMMON_EXCLUDE";

import { handleApiError, ApiError } from "@utils/handleError";

import { getUser } from "@authFeat/services/authService";
import { Game, GameQuest, GameBonus } from "@gameFeat/models";

/**
 * Gets all games from the database optionally for the client or internal use.
 */
export async function getGames(status?: GameStatus, forClient?: boolean) {
  try {
    return await Game.find({
      ...(forClient ? { status: { $ne: "inactive" } } : status && { status })
    }).select(
      forClient
        ? `${CLIENT_COMMON_EXCLUDE} ${status !== undefined ? `-status ${status !== "active" ? " -odds" : ""}` : ""}`
        : ""
    );
  } catch (error: any) {
    throw handleApiError(error, "getGames service error.");
  }
}
/**
 * Gets a specific game from the database.
 * @throws `ApiError 404` if the document is not found.
 */
export async function getGame(by: "_id" | "title", value: ObjectId | string) {
  try {
    const game = await Game.findOne({ [by]: value });
    if (!game) throw new ApiError("GAME_NOT_FOUND", "game", 404, "not found");
    
    return game;
  } catch (error: any) {
    throw handleApiError(error, "getGame service error.");
  }
}

/**
 * Gets all quests from the database optionally for the client or internal use.
 * @param options.projection (Optional) Must only be a `string`, space-separated field names.
 * @param options.username (Optional) Gets the quest progress of the specified user, formatted for the client.
 * @throws (Optional) `ApiError 404` user not found if `options.username` is passed.
 */
export async function getQuests<
  TOptions extends QueryOptions<UserDoc> & {
    projection?: string;
    username?: string;
    status?: GameQuestStatus;
    forClient?: boolean;
  }
>(
  options: TOptions = {} as TOptions
): Promise<TOptions["username"] extends string ? UserDoc : GameQuestDoc[]> {
  const { username, status, forClient, projection = "", ...restOpts } = options;

  try {
    if (username) {
      const user = await getUser({ by: "username", value: username }, {
        projection: "-_id statistics",
        populate: {
          path: "statistics",
          select: "-_id progress.quest",
          populate: [
            {
              path: "progress.quest.$*.quest",
              select: CLIENT_COMMON_EXCLUDE
            }
          ]
        }
      });
      if (!user)
        throw new ApiError("GAME_PROFILE_NOT_FOUND", "game", 404, "not found", {
          var: { username }
        });

      return user as any;
    } else {
       return (await GameQuest.find(
        { ...(forClient ? { status: { $ne: "inactive" } } : status && { status }) },
        forClient ? `${CLIENT_COMMON_EXCLUDE} -status` : projection,
        restOpts
      )) as any;
    }
  } catch (error: any) {
    throw handleApiError(error, "getQuests service error.");
  }
}
/**
 * Gets a specific quest from the database.
 * @throws `ApiError 404` if the document is not found.
 */
export async function getQuest(by: "_id" | "title", value: ObjectId | string) {
  try {
    const quest = await GameQuest.findOne({ [by]: value });
    if (!quest) throw new ApiError("QUEST_NOT_FOUND", "game", 404, "not found");

    return quest;
  } catch (error: any) {
    throw handleApiError(error, "getQuest service error.");
  }
}

/**
 * Gets all bonuses from the database optionally for the client or internal use.
 */
export async function getBonuses(
  options: QueryOptions<UserDoc> & {
    projection?: string;
    status?: GameBonusStatus;
    forClient?: boolean;
  } = {}
) {
  const { status, forClient, projection = "", ...restOpts } = options;

  try {
    return await GameBonus.find(
      {
        ...(forClient ? { status: { $ne: "inactive" } } : status && { status }),
      },
      forClient ? `${CLIENT_COMMON_EXCLUDE} -status` : projection,
      restOpts
    );
  } catch (error: any) {
    throw handleApiError(error, "getBonuses service error.");
  }
}
/**
 * Gets a specific bonus from the database.
 * @throws `ApiError 404` if the document is not found.
 */
export async function getBonus(by: "_id" | "title", value: ObjectId | string) {
  try {
    const bonus = await GameBonus.findOne({ [by]: value });
    if (!bonus) throw new ApiError("BONUS_NOT_FOUND", "game", 404, "not found");

    return bonus;
  } catch (error: any) {
    throw handleApiError(error, "getBonus service error.");
  }
}
