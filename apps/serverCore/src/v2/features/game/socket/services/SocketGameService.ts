/**
 * Socket Game Service
 *
 * Description:
 * Manages game related logic in real-time; wins, losses, progress for quests and bonuses.
 */

import type { Socket, Namespace } from "socket.io";
import type SocketCallback from "@typings/SocketCallback";
import type { ClientSession } from "mongoose"
import type { UserBonus, UserQuest } from "@authFeat/typings/User";

import type { ManageProgressEventDto } from "@qc/typescript/dtos/ManageProgressEventDto";

import { Types, startSession } from "mongoose"

import { logger } from "@qc/utils";
import { handleSocketError, SocketError } from "@utils/handleError";

import { GameQuest, GameBonus } from "@gameFeat/models";
import { User } from "@authFeat/models";
import { redisClient } from "@cache";
import { updateUserCredentials, updateUserStatistics } from "@authFeat/services/authService";

export default class SocketAuthService {
  private socket: Socket;
  private io: Namespace;

  constructor(socket: Socket, io: Namespace) {
    this.socket = socket;
    this.io = io;
  }

  /**
   * Adds a win, draw or loss to the user.
   */
  public async manageRecord({}, callback: SocketCallback) {
    logger.debug("socket manageRecord:", {});
  
    try {
      // const user = this.socket.userDecodedClaims!;

      return callback({
        status: "accepted",
        message: "Under construction."
      });
    } catch (error: any) {
      return handleSocketError(callback, this.socket, error, "manageRecord service error.");
    }
  }

  /**
   * TODO: Quest rewards not tested since the game server isn't a thing.
   * Increases the current progress of a quest or bonus and can also activate a bonus and give a quest reward.
   * @payload `ok` with quest or bonus progress, `bad request`, `forbidden`, `conflict` or `SocketError`.
   */
  public async manageProgress({ type, action, title }: ManageProgressEventDto, callback: SocketCallback) {
    logger.debug("socket manageProgress:", { type, action, title });

    let session: ClientSession | null = null;
  
    try {
      const userClaims = this.socket.userDecodedClaims!;

      if (type !== "bonus" && action === "activate") throw new SocketError("NO_DATA_INVALID", "general", "bad request");

      const exists = await (type === "quest" ? GameQuest : GameBonus).exists({ title: title });
      if (!exists) throw new SocketError("ACCESS_DENIED", "general", "forbidden");

      const isActivate = type === "bonus" && action === "activate",
        now = Date.now();

      const user = await User.aggregate([
        { $match: { _id: new Types.ObjectId(userClaims.sub) } },
        {
          $lookup: {
            from: "user_statistics",
            localField: "statistics",
            foreignField: "_id",
            as: "statistics"
          }
        },
        { $unwind: "$statistics" },
        // Checks if there is no active bonus already for the user.
        ...(isActivate
          ? [
              {
                $set: {
                  activeBonus: {
                    $map: {
                      input: { $objectToArray: "$statistics.progress.bonus" },
                      as: "bonus",
                      in: {
                        k: "$$bonus.k",
                        v: "$$bonus.v"
                      }
                    }
                  }
                }
              },
              {
                $set: {
                  activeBonus: {
                    $filter: {
                      input: "$activeBonus",
                      as: "bonus",
                      cond: { $gt: ["$$bonus.v.activated", now] }
                    }
                  }
                }
              },
              {
                $match: { activeBonus: { $size: 0 } }
              }
            ]
          : []),
        {
          $project: {
            "_id": 0,
            "statistics.progress": 1
          }
        }
      ]);
      if (!user[0]) {
        if (isActivate) {
          // Checks if the reason wasn't because of the id.
          const exists = await User.exists({ _id: userClaims.sub });
          if (!exists) throw new SocketError("USER_NOT_FOUND_VAL", "general", "not found");
          
          throw new SocketError("MANAGE_PROGRESS_BONUS_LOCKED_NEW", "game", "conflict");
        } else {
          throw new SocketError("USER_NOT_FOUND_VAL", "general", "not found");
        }
      }
      // console.log("user", user);
      const target = user[0].statistics.progress[type][title];
      // console.log("target", target);

      if (isActivate) {
        this.isBonusActivatable(target as UserBonus);
       
        if (!this.isQuestOrBonusCompleted("bonus", target))
          throw new SocketError(
            "MANAGE_PROGRESS_BONUS_LOCKED_PROGRESS",
            "game",
            "bad request"
          );
      }

      if (type === "quest") {
        session = await startSession();
        session.startTransaction();
      }

      const path = `progress.${type}.${title}`,
        updatedUserStatistics = await updateUserStatistics(
          {
            by: "_id",
            value: userClaims.sub
          },
          {
            $set: {
              [`${path}.${type}`]: exists._id,
              ...(isActivate && {
                [`${path}.activated`]: Date.now() + 60 * 60 * 24 * 1000
              })
            },
            ...(action === "progress" && {
              $inc: { [`${path}.current`]: 1 }
            })
          },
          {
            session,
            projection: "-_id progress",
            populate: {
              path: `progress.${type}.$*.${type}`
            },
            new: true,
            lean: true
            // forClient: true
          }
        );
      // console.log("manageProgress updatedUserStatistics", updatedUserStatistics);

      if (!isActivate) {
        if (this.isQuestOrBonusCompleted("quest", target)) {
          const userQuest = 
            (updatedUserStatistics.progress.quest as unknown as Record<string, UserQuest>)[title];

          // console.log("userQuest", userQuest);

          if (!userQuest.claimed) {
            if (userQuest.quest.reward.type === "money") {
              await updateUserCredentials(          
                {
                  by: "_id",
                  value: userClaims.sub
                },
                { $inc: { balance: userQuest.quest.reward.value } },
                { session }
              )
            } else if (userQuest.quest.reward.type === "spins") {
              // TODO: This is nothing right now (probably just add a field in the user for rewards (bonus money if that ever happens, spins, and bonus multiplier too maybe?)).
            } else {
              throw new SocketError("ACCESS_DENIED", "general", "forbidden");
            }
            
            await updateUserStatistics(
              {
                by: "_id",
                value: userClaims.sub,
              },
              { $set: { [`progress.quest.${title}.claimed`]: true } },
              { session }
            );
          } else {
            throw new SocketError("MANAGE_PROGRESS_QUEST_USED", "game", "conflict");
          }
        }
      }

      await session?.commitTransaction();

      return callback({
        status: "ok",
        message: `Successfully ${action === "activate" ? action + "d" : "gained progress for"} ${type} "${title}".`,
        progress: { [type]: updatedUserStatistics.progress[type as keyof typeof updatedUserStatistics.progress] }
      });
    } catch (error: any) {
      await session?.abortTransaction();
      return handleSocketError(callback, this.socket, error, "manageProgress service error.");
    } finally {
      session?.endSession();
    }
  }

  /**
   * Handles socket instance disconnection; removes the user's redis socket ids.
   */
  public async disconnect() {
    logger.debug(`Game socket instance disconnected; ${this.socket.id}.`);

    try {
      await redisClient.sRem(
        `user:${this.socket.userDecodedClaims!.member_id}:chat:socket_ids`,
        this.socket.id
      );
    } catch (error: any) {
      logger.error("game/disconnect service error:\n", error.message);
    }
  }

  /**
   * Validates if the given bonus can be activated.
   */
  private isBonusActivatable(userBonus: UserBonus | undefined) {
    if (userBonus?.activated) {
      // Checks if the bonus is currently active.
      if (userBonus.activated > Date.now())
        throw new SocketError("MANAGE_PROGRESS_BONUS_LOCKED_ACTIVE", "game", "conflict");

      // Checks if the bonus was already activated before and expired.
      if (userBonus.activated <= Date.now())
        throw new SocketError("MANAGE_PROGRESS_BONUS_USED", "game", "conflict");
    }

    return true;
  };

  /**
   * Checks if the current progress reached the quest or bonus progress cap.
   */
  private isQuestOrBonusCompleted(
    type: "quest" | "bonus",
    // @ts-ignore
    { current, [type]: questOrBonus }: UserBonus | UserQuest = {}
  ) {
    // There is only 'one-time' (0/0) bonuses, not quests.
    if (type === "bonus" && !current && !questOrBonus?.cap) {
      return true;
    }

    return current >= (questOrBonus?.cap || 0);
  };
}
