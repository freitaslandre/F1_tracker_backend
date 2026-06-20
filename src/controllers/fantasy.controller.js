const FantasyModel = require("../models/fantasy.model");
const httpError = require("../utils/httpError");
const { isNonEmptyString } = require("../utils/validation");

const isValidNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

const validateDriver = (driver) =>
  driver &&
  isNonEmptyString(driver.id) &&
  isNonEmptyString(driver.name) &&
  isNonEmptyString(driver.team) &&
  isNonEmptyString(driver.initials) &&
  isValidNumber(driver.price) &&
  isValidNumber(driver.points);

const validateConstructor = (constructor) =>
  constructor &&
  isNonEmptyString(constructor.id) &&
  isNonEmptyString(constructor.name) &&
  isNonEmptyString(constructor.nationality) &&
  isNonEmptyString(constructor.initials) &&
  isValidNumber(constructor.price) &&
  isValidNumber(constructor.points);

const getTeam = (req, res, next) => {
  try {
    return res.json({
      team: FantasyModel.findByUser(req.user.id),
    });
  } catch (error) {
    return next(error);
  }
};

const saveTeam = (req, res, next) => {
  try {
    const { drivers, constructors, budgetLimit = 100, budgetUsed } = req.body;

    if (!Array.isArray(drivers) || drivers.length !== 5) {
      throw httpError(400, "Fantasy team must include exactly 5 drivers");
    }
    if (!Array.isArray(constructors) || constructors.length !== 2) {
      throw httpError(400, "Fantasy team must include exactly 2 constructors");
    }
    if (!drivers.every(validateDriver) || !constructors.every(validateConstructor)) {
      throw httpError(400, "Fantasy team contains invalid items");
    }

    const calculatedBudgetUsed = [...drivers, ...constructors].reduce(
      (sum, item) => sum + Number(item.price),
      0,
    );
    const finalBudgetUsed = Number(
      (isValidNumber(budgetUsed) ? Number(budgetUsed) : calculatedBudgetUsed).toFixed(1),
    );

    if (finalBudgetUsed > Number(budgetLimit)) {
      throw httpError(400, "Fantasy team exceeds the available budget");
    }

    const savedTeam = FantasyModel.save({
      userId: req.user.id,
      budgetLimit: Number(budgetLimit),
      budgetUsed: finalBudgetUsed,
      drivers: drivers.map((driver) => ({
        id: driver.id.trim(),
        name: driver.name.trim(),
        team: driver.team.trim(),
        initials: driver.initials.trim(),
        price: Number(driver.price),
        points: Number(driver.points),
      })),
      constructors: constructors.map((constructor) => ({
        id: constructor.id.trim(),
        name: constructor.name.trim(),
        nationality: constructor.nationality.trim(),
        initials: constructor.initials.trim(),
        price: Number(constructor.price),
        points: Number(constructor.points),
      })),
    });

    return res.status(201).json({ team: savedTeam });
  } catch (error) {
    return next(error);
  }
};

const deleteTeam = (req, res, next) => {
  try {
    FantasyModel.deleteByUser(req.user.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  deleteTeam,
  getTeam,
  saveTeam,
};
