const { Router } = require("express");
const FantasyController = require("../controllers/fantasy.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = Router();

router.get("/leaderboard", FantasyController.leaderboard);
router.get("/team", requireAuth, FantasyController.getTeam);
router.put("/team", requireAuth, FantasyController.saveTeam);
router.delete("/team", requireAuth, FantasyController.deleteTeam);

module.exports = router;
