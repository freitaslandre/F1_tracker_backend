const FavoriteModel = require("../models/favorite.model");
const FantasyModel = require("../models/fantasy.model");
const UserModel = require("../models/user.model");
const VoteModel = require("../models/vote.model");
const httpError = require("../utils/httpError");

const getProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findPublicById(req.user.id);
    if (!user) {
      throw httpError(404, "User not found");
    }

    const [favorites, fantasyTeam, votes] = await Promise.all([
      FavoriteModel.findByUser(user.id),
      FantasyModel.findByUser(user.id),
      VoteModel.findByUser(user.id),
    ]);

    return res.json({
      user,
      favorites,
      fantasyTeam,
      votes,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
};
