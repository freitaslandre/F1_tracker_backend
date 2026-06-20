const ApifyService = require("../services/apify.service");
const FavoriteModel = require("../models/favorite.model");
const VoteModel = require("../models/vote.model");
const httpError = require("../utils/httpError");
const { isNonEmptyString } = require("../utils/validation");

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

    const result = await ApifyService.getRaces(season);
    res.set("X-Cache", result.cacheStatus);
    res.set("Cache-Control", "private, max-age=300");
    return res.json(result.races);
  } catch (error) {
    return next(error);
  }
};

const getStandings = async (req, res, next) => {
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

    const result = await ApifyService.getStandings(season);
    res.set("X-Cache", result.cacheStatus);
    res.set("Cache-Control", "private, max-age=300");
    return res.json(result.standings);
  } catch (error) {
    return next(error);
  }
};

const vote = (req, res, next) => {
  try {
    const {
      raceSeason,
      raceRound,
      raceName,
      driverId,
      driverName,
    } = req.body;
    const required = [raceSeason, raceRound, raceName, driverId, driverName];

    if (!required.every(isNonEmptyString)) {
      throw httpError(
        400,
        "raceSeason, raceRound, raceName, driverId and driverName are required",
      );
    }

    const savedVote = VoteModel.upsert({
      userId: req.user.id,
      raceSeason: raceSeason.trim(),
      raceRound: raceRound.trim(),
      raceName: raceName.trim(),
      driverId: driverId.trim(),
      driverName: driverName.trim(),
    });

    return res.status(201).json(savedVote);
  } catch (error) {
    return next(error);
  }
};

const addFavorite = (req, res, next) => {
  try {
    const { circuitId, circuitName, locality = "", country } = req.body;

    if (
      !isNonEmptyString(circuitId) ||
      !isNonEmptyString(circuitName) ||
      !isNonEmptyString(country)
    ) {
      throw httpError(
        400,
        "circuitId, circuitName and country are required",
      );
    }

    const favorite = FavoriteModel.upsert({
      userId: req.user.id,
      circuitId: circuitId.trim(),
      circuitName: circuitName.trim(),
      locality: typeof locality === "string" ? locality.trim() : "",
      country: country.trim(),
    });

    return res.status(201).json(favorite);
  } catch (error) {
    return next(error);
  }
};

const removeFavorite = (req, res, next) => {
  try {
    const { circuitId } = req.params;
    if (!isNonEmptyString(circuitId)) {
      throw httpError(400, "circuitId is required");
    }

    FavoriteModel.deleteByUserAndCircuit(req.user.id, circuitId.trim());
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  addFavorite,
  getRaces,
  getStandings,
  removeFavorite,
  vote,
};
