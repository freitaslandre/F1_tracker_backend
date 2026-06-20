const ApifyService = require("./apify.service");
const FantasyModel = require("../models/fantasy.model");
const httpError = require("../utils/httpError");

const driverAliases = {
  verstappen: ["max_verstappen", "verstappen"],
  hulkenberg: ["hulkenberg", "hülkenberg"],
  perez: ["perez", "sergio_perez"],
  sainz: ["sainz", "carlos_sainz"],
};

const constructorAliases = {
  red_bull: ["red_bull", "red bull", "red bull racing"],
  aston_martin: ["aston_martin", "aston martin"],
  haas: ["haas", "haas f1 team"],
  racing_bulls: ["rb", "racing bulls", "visa cash app rb"],
};

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getDriverKeys = (item) => {
  const id = normalizeKey(item.externalId);
  return new Set([
    id,
    ...(driverAliases[id] || []).map(normalizeKey),
    normalizeKey(item.name),
  ]);
};

const getConstructorKeys = (item) => {
  const id = normalizeKey(item.externalId);
  return new Set([
    id,
    ...(constructorAliases[id] || []).map(normalizeKey),
    normalizeKey(item.name),
  ]);
};

const underdogBase = (item) => {
  const price = Number(item.price) || 0;
  const ceiling = item.itemType === "constructor" ? 32 : 34;
  const multiplier = item.itemType === "constructor" ? 1.1 : 1.35;
  return Math.max(0, Math.round((ceiling - price) * multiplier));
};

const positionBonus = (position) => {
  const value = Number(position);
  if (!Number.isFinite(value)) return 0;
  if (value === 1) return 10;
  if (value === 2) return 8;
  if (value === 3) return 6;
  if (value <= 10) return Math.max(1, 11 - value);
  return 0;
};

const driverRacePoints = (result) => {
  const officialPoints = Number(result.points) || 0;
  const position = Number(result.position) || 99;
  const grid = Number(result.grid);
  const gainedPlaces = Number.isFinite(grid) && grid > 0 ? Math.max(0, grid - position) : 0;
  const finished = String(result.status || "").toLowerCase() === "finished";
  const lapped = String(result.status || "").startsWith("+");
  const classified = finished || lapped;
  const fastestLap = result.FastestLap?.rank === "1" ? 3 : 0;

  return (
    officialPoints +
    positionBonus(position) +
    Math.min(gainedPlaces, 10) +
    fastestLap +
    (classified ? 2 : -2)
  );
};

const buildRaceMaps = (race) => {
  const drivers = new Map();
  const constructors = new Map();

  for (const result of race.Results || []) {
    const driverKeys = [
      result.Driver?.driverId,
      `${result.Driver?.givenName || ""} ${result.Driver?.familyName || ""}`,
    ].map(normalizeKey);
    const constructorKeys = [
      result.Constructor?.constructorId,
      result.Constructor?.name,
    ].map(normalizeKey);
    const points = driverRacePoints(result);

    driverKeys.forEach((key) => {
      if (key) drivers.set(key, { result, points });
    });

    constructorKeys.forEach((key) => {
      if (!key) return;
      const current = constructors.get(key) || { points: 0, drivers: 0 };
      constructors.set(key, {
        points: current.points + points,
        drivers: current.drivers + 1,
      });
    });
  }

  return { drivers, constructors };
};

const findByKeys = (map, keys) => {
  for (const key of keys) {
    const found = map.get(key);
    if (found) return found;
  }
  return null;
};

const scoreItem = (item, raceMaps) => {
  const base = underdogBase(item);

  if (item.itemType === "driver") {
    const match = findByKeys(raceMaps.drivers, getDriverKeys(item));
    const race = match?.points || 0;
    return {
      itemType: item.itemType,
      externalId: item.externalId,
      name: item.name,
      basePoints: base,
      racePoints: race,
      totalPoints: base + race,
      source: match ? "race-result" : "not-classified",
    };
  }

  const match = findByKeys(raceMaps.constructors, getConstructorKeys(item));
  const race = match ? Math.round(match.points * 0.65) : 0;
  return {
    itemType: item.itemType,
    externalId: item.externalId,
    name: item.name,
    basePoints: base,
    racePoints: race,
    totalPoints: base + race,
    source: match ? `${match.drivers} classified drivers` : "not-classified",
  };
};

const scoreRace = async (season, round) => {
  const { races } = await ApifyService.getRaces(season);
  const race = races.find((item) => String(item.round) === String(round));

  if (!race) {
    throw httpError(404, "Race not found");
  }
  if (!Array.isArray(race.Results) || race.Results.length === 0) {
    throw httpError(400, "Race results are not available yet");
  }

  const raceMaps = buildRaceMaps(race);
  const teams = await FantasyModel.findAllTeams();
  const scores = teams.map((team) => {
    const details = [...team.drivers, ...team.constructors].map((item) => scoreItem(item, raceMaps));
    const basePoints = details.reduce((sum, item) => sum + item.basePoints, 0);
    const racePoints = details.reduce((sum, item) => sum + item.racePoints, 0);
    const totalPoints = details.reduce((sum, item) => sum + item.totalPoints, 0);

    return {
      teamId: team.id,
      userId: team.userId,
      raceSeason: String(season),
      raceRound: String(round),
      raceName: race.raceName,
      basePoints,
      racePoints,
      totalPoints,
      detailsJson: JSON.stringify(details),
    };
  });

  await FantasyModel.saveScores(scores);

  return {
    race: {
      season: String(season),
      round: String(round),
      raceName: race.raceName,
    },
    scoredTeams: scores.length,
    scores,
  };
};

module.exports = {
  scoreRace,
};
