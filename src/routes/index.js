const { Router } = require("express");
const authRoutes = require("./auth.routes");
const f1Routes = require("./f1.routes");
const fantasyRoutes = require("./fantasy.routes");

const router = Router();

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API health check
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: API is running
 */
router.get("/", (_req, res) => {
  res.json({ message: "API is running" });
});

router.use("/auth", authRoutes);
router.use("/f1", f1Routes);
router.use("/fantasy", fantasyRoutes);

module.exports = router;
