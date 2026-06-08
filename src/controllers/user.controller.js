const FavoriteModel = require("../models/favorite.model");
const UserModel = require("../models/user.model");
const VoteModel = require("../models/vote.model");
const httpError = require("../utils/httpError");

const getProfile = (req, res, next) => {
  try {
    const user = UserModel.findPublicById(req.user.id);
    if (!user) {
      throw httpError(404, "User not found");
    }

    return res.json({
      user,
      favorites: FavoriteModel.findByUser(user.id),
      votes: VoteModel.findByUser(user.id),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
};
