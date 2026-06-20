const httpError = require("../utils/httpError");

const JOLPICA_API = "https://api.jolpi.ca/ergast/f1";
const cache = new Map();

const getCacheTtlMs = () => {
  const hours = Number(process.env.F1_CACHE_HOURS || 3);
  return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
};

const fetchJolpicaJson = async (url) => {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch (error) {
    throw httpError(502, `Could not reach Jolpica API: ${error.message}`);
  }

  if (!response.ok) {
    const details = await response.text();
    throw httpError(502, `Jolpica request failed (${response.status}): ${details.slice(0, 200)}`);
  }

  return response.json();
};

const fetchRaceResults = async (season, round) => {
  try {
    const json = await fetchJolpicaJson(`${JOLPICA_API}/${season}/${round}/results.json`);
    return json?.MRData?.RaceTable?.Races?.[0]?.Results ?? [];
  } catch {
    return [];
  }
};

const fetchRacesFromJolpica = async (season) => {
  const json = await fetchJolpicaJson(`${JOLPICA_API}/${season}/races.json`);
  const races = json?.MRData?.RaceTable?.Races;

  if (!Array.isArray(races)) {
    throw httpError(502, "Jolpica returned an unexpected response");
  }

  return Promise.all(
    races.map(async (race) => ({
      ...race,
      Results: await fetchRaceResults(season, race.round),
    })),
  );
};

const getRaces = async (season) => {
  const cached = cache.get(season);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return { races: cached.races, cacheStatus: "HIT" };
  }

  const races = await fetchRacesFromJolpica(season);
  cache.set(season, {
    races,
    expiresAt: now + getCacheTtlMs(),
  });

  return { races, cacheStatus: "MISS" };
};

module.exports = {
  getRaces,
};
