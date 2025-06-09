import { type ClientSession, startSession } from "mongoose";

import handleMultipleTransactionPromises from "@utils/handleMultipleTransactionPromises";

import { GameQuest, GameBonus } from "@gameFeat/models";
import Db from "@model/Db";
import establishRedisConnection, { redisClient } from "@cache"


export const KEY = (type: "quests" | "bonuses") => `game:${type}:rotation_key`;

export const EXPIRY_BUFFER = 10 * 60;

const GROUP = {
  quests: [
    ["Beginner's Luck", "On a Role", "Outlaw", "Lucky You", "Crank That", "Hittin' Me"],
    [],
    []
  ],
  bonuses: [
    ["Register a Profile", "Free Daily Bonus", "5 Daily Logins", "10 Daily Logins", "", ""],
    [],
    []
  ]
};

/**
 * Randomizes until a different index is found.
 */
async function getNewRotationIndex(type: "quests" | "bonuses") {
  const prevIndex = parseInt((await redisClient.get(KEY(type))) ?? "-1", 10),
    maxIndex = GROUP[type].length;

  let newIndex: number;
  do {
    newIndex = Math.floor(Math.random() * maxIndex);
  } while (newIndex === prevIndex && maxIndex > 1);

  await redisClient.set(KEY(type), newIndex, { EX: 60 * 60 * 24 * 14 + EXPIRY_BUFFER }); // 2 weeks (plus 10 minutes just to ensure that this doesn't expire before the job runs).
  return newIndex;
}

export default async function rotateQuestsAndBonuses() {
  let session: ClientSession | undefined;

  try {
    const [] = await Promise.all([
      new Db().connectBaseCluster(),
      establishRedisConnection()
    ]);
  
    session = await startSession();
    session.startTransaction();

    const [newQuestIndex, newBonusIndex] = await Promise.all([
      getNewRotationIndex("quests"),
      getNewRotationIndex("bonuses")
    ]);

    await handleMultipleTransactionPromises([
      // Deactivates the previously active quests and bonuses.
      GameQuest.updateMany(
        { status: "active" },
        { $set: { status: "inactive" } },
        { session }
      ),
      GameBonus.updateMany(
        { status: "active" },
        { $set: { status: "inactive" } },
        { session }
      ),
      // Activates the new quests and bonuses.
      GameQuest.updateMany(
        { name: { $in: GROUP.quests[newQuestIndex] } },
        { $set: { status: "active" } },
        { session }
      ),
      GameBonus.updateMany(
        { name: { $in: GROUP.bonuses[newBonusIndex] } },
        { $set: { status: "active" } },
        { session }
      ),
    ]);

    await session.commitTransaction();

    await Promise.all([
      redisClient.set("game:quests:rotation_key", newQuestIndex, { EX: 60 * 60 * 24 * 14 }),
      redisClient.set("game:bonuses:rotation_key", newBonusIndex, { EX: 60 * 60 * 24 * 14 })
    ]);
  } catch (error) {
    await session?.abortTransaction();
    throw error;
  } finally {
    session?.endSession();
  }
}
