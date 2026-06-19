const { Router } = require("express");
const F1Controller = require("../controllers/f1.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = Router();

/**
 * @swagger
 * /api/f1/races:
 *   get:
 *     summary: Get real F1 race results through the Apify actor
 *     tags: [Formula 1]
 *     parameters:
 *       - in: query
 *         name: season
 *         schema:
 *           type: integer
 *         description: Championship year. Defaults to the current year.
 *     responses:
 *       200:
 *         description: Races in Jolpica-compatible format
 *       502:
 *         description: External Apify request failed
 *       503:
 *         description: APIFY_TOKEN is not configured
 */
router.get("/races", F1Controller.getRaces);

/**
 * @swagger
 * /api/f1/vote:
 *   post:
 *     summary: Create or update the authenticated user's Driver of the Day vote
 *     tags: [Formula 1]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [raceSeason, raceRound, raceName, driverId, driverName]
 *             properties:
 *               raceSeason:
 *                 type: string
 *                 example: "2026"
 *               raceRound:
 *                 type: string
 *                 example: "1"
 *               raceName:
 *                 type: string
 *                 example: Australian Grand Prix
 *               driverId:
 *                 type: string
 *                 example: norris
 *               driverName:
 *                 type: string
 *                 example: Lando Norris
 *     responses:
 *       201:
 *         description: Vote saved
 *       401:
 *         description: Authentication required
 */
router.post("/vote", requireAuth, F1Controller.vote);

/**
 * @swagger
 * /api/f1/favorites:
 *   post:
 *     summary: Add or update a favorite circuit
 *     tags: [Formula 1]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [circuitId, circuitName, country]
 *             properties:
 *               circuitId:
 *                 type: string
 *                 example: albert_park
 *               circuitName:
 *                 type: string
 *                 example: Albert Park Grand Prix Circuit
 *               locality:
 *                 type: string
 *                 example: Melbourne
 *               country:
 *                 type: string
 *                 example: Australia
 *     responses:
 *       201:
 *         description: Favorite saved
 *       401:
 *         description: Authentication required
 */
router.post("/favorites", requireAuth, F1Controller.addFavorite);

router.delete("/favorites/:circuitId", requireAuth, F1Controller.removeFavorite);

module.exports = router;
