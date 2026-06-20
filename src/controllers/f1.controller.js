const F1Service = require("../services/f1.service");
const httpError = require("../utils/httpError");

const getRaces = async (req, res, next) => {
  try {
    const currentYear = new Date().getUTCFullYear();
    const season = String(req.query.season || currentYear);
    const seasonNumber = Number(season);

    if (
      !Number.isInteger(seasonNumber) ||
      seasonNumber < 1950 ||
      seasonNumber > currentYear
    ) {
      throw httpError(400, `Season must be between 1950 and ${currentYear}`);
    }

    const result = await F1Service.getRaces(season);
    res.set("X-Cache", result.cacheStatus);
    res.set("Cache-Control", "private, max-age=300");
    return res.json(result.races);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRaces,
};
