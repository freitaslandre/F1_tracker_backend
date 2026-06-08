const { Router } = require("express");
const UserController = require("../controllers/user.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = Router();

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get the authenticated user's profile, favorites and votes
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Authentication required
 */
router.get("/profile", requireAuth, UserController.getProfile);

module.exports = router;
