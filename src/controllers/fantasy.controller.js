const FantasyModel = require("../models/fantasy.model");
const httpError = require("../utils/httpError");

const toFantasyItem = (item, itemType, positionIndex) => ({
  itemType,
  externalId: String(item.id || item.externalId || "").trim(),
  name: String(item.name || "").trim(),
  teamName: item.team ? String(item.team).trim() : item.teamName,
  nationality: item.nationality ? String(item.nationality).trim() : undefined,
  initials: String(item.initials || "").trim(),
  price: Number(item.price),
  points: Number(item.points),
  positionIndex,
});

const validateItems = (drivers, constructors, budgetUsed) => {
  if (!Array.isArray(drivers) || drivers.length !== 5) {
    throw httpError(400, "Fantasy team must include exactly 5 drivers");
  }
  if (!Array.isArray(constructors) || constructors.length !== 2) {
    throw httpError(400, "Fantasy team must include exactly 2 constructors");
  }
  if (!Number.isFinite(budgetUsed) || budgetUsed > 100) {
    throw httpError(400, "Fantasy team must stay within the 100M budget");
  }
};

const getTeam = (req, res, next) => {
  try {
    return res.json({ team: FantasyModel.findByUserId(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

const saveTeam = (req, res, next) => {
  try {
    const { drivers, constructors, budgetLimit = 100, budgetUsed } = req.body;
    const budget = Number(budgetUsed);
    validateItems(drivers, constructors, budget);

    const team = FantasyModel.save({
      userId: req.user.id,
      budgetLimit: Number(budgetLimit) || 100,
      budgetUsed: budget,
      drivers: drivers.map((driver, index) => toFantasyItem(driver, "driver", index)),
      constructors: constructors.map((constructor, index) =>
        toFantasyItem(constructor, "constructor", index),
      ),
    });

    return res.json({ team });
  } catch (error) {
    return next(error);
  }
};

const deleteTeam = (req, res, next) => {
  try {
    FantasyModel.deleteByUserId(req.user.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const leaderboard = (_req, res, next) => {
  try {
    return res.json({ leaderboard: FantasyModel.leaderboard() });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  deleteTeam,
  getTeam,
  leaderboard,
  saveTeam,
};
