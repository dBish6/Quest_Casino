/**
 * HTTP Game Service
 *
 * Description:
 * Handles HTTP-related functionalities related to games; quests, bonuses, and leaderboard.
 */

import type { LeaderboardType } from "@qc/constants";
import type { AddGameBodyDto, AddQuestBodyDto, AddBonusBodyDto } from "@gameFeatHttp/dtos/AddGameDto";

import { Types } from "mongoose";

import { handleHttpError } from "@utils/handleError";
import userProfileAggregation from "@authFeatHttp/utils/userProfileAggregation";

import { Game, GameQuest, GameBonus } from "@gameFeat/models";
import { User } from "@authFeat/models";

export type AddGameType = "Game" | "Quest" | "Bonus";

const MODALS = Object.freeze({
  Game,
  GameQuest,
  GameBonus
});

/**
 * Adds a new game related document to the database.
 * @param type The type of entity to add (`Game`, `Quest`, or `Bonus`).
 */
export async function addGame(type: AddGameType, body: AddGameBodyDto | AddQuestBodyDto | AddBonusBodyDto) {
  try {
    await new MODALS[(type === "Game" ? type : `Game${type}`) as keyof typeof MODALS](
      { _id: new Types.ObjectId(), ...body }
    ).save();
  } catch (error: any) {
    throw handleHttpError(error, "addGame service error.");
  }
}

/**
 * Gets all the top 10 users from the database in `ViewUserProfileCredentials` format.
 */
export async function getLeaderboard(type: LeaderboardType) {
  try {
    const topUsers = await User.aggregate([
      {
        $lookup: {
          from: "user_statistics",
          localField: "statistics",
          foreignField: "_id",
          as: "statisticsData"
        }
      },
      { $unwind: "$statisticsData" },
      {
        $match: { [`statisticsData.wins.${type}`]: { $gt: 0 } }
      },

      { $sort: { [`statisticsData.wins.${type}`]: -1 } },
      { $limit: 10 },

      ...userProfileAggregation(true, "$statisticsData"),

      {
        $project: {
          _id: 0,
          member_id: 1,
          email: 1,
          username: 1,
          legal_name: 1,
          avatar_url: 1,
          country: 1,
          bio: 1,
          activity: { game_history: "$activityData.game_history" },
          statistics: "$statisticsData"
        }
      }
    ]);

    return topUsers;
  } catch (error: any) {
    throw handleHttpError(error, "addGame service error.");
  }
}
