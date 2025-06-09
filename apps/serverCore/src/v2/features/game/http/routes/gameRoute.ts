import { Router } from "express";
import verifyUserToken from "@authFeat/middleware/tokens/verifyUserToken";
import { verifyCsrfToken } from "@authFeatHttp/middleware/tokens";
import * as gameController from "@gameFeatHttp/controllers/gameController";

const router = Router();

router.post("/games/:type", verifyCsrfToken, gameController.addGame);

router.get("/games", gameController.getGames);
router.get("/game", gameController.getGame);

router.get("/games/leaderboard", verifyUserToken, gameController.getLeaderboard);

router.get("/games/quests", verifyUserToken, gameController.getQuests);
router.get("/games/quest", gameController.getQuest);

router.get("/games/bonuses", verifyUserToken, gameController.getBonuses);
router.get("/games/bonus", gameController.getBonus);

export default router;
