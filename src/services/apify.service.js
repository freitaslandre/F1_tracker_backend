const httpError = require("../utils/httpError");

const DEFAULT_ACTOR_URL =
  "https://api.apify.com/v2/acts/jungle_synthesizer~jolpica-f1-results-scraper/run-sync-get-dataset-items";
const JOLPICA_API = "https://api.jolpi.ca/ergast/f1";
const cache = new Map();

const getCacheTtlMs = () => {
  const hours = Number(process.env.F1_CACHE_HOURS || 3);
  return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
};

const stringify = (value, fallback = "") =>
  value === null || value === undefined ? fallback : String(value);

const splitDriverName = (fullName) => {
  const parts = stringify(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { givenName: parts[0] || "", familyName: "" };
  }
  return {
    givenName: parts.slice(0, -1).join(" "),
    familyName: parts.at(-1),
  };
};

const formatMillis = (milliseconds) => {
  const value = Number(milliseconds);
  if (!Number.isFinite(value) || value < 0) return "";

  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = ((value % 60_000) / 1000).toFixed(3).padStart(6, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
};

const mapResult = (item) => {
  const { givenName, familyName } = splitDriverName(item.driver_name);
  const result = {
    number: stringify(item.driver_permanent_number),
    position: stringify(item.position),
    positionText: stringify(item.position_text, stringify(item.position)),
    points: stringify(item.points, "0"),
    Driver: {
      driverId: stringify(item.driver_id),
      permanentNumber: stringify(item.driver_permanent_number),
      code: stringify(item.driver_code),
      url: "",
      givenName,
      familyName,
      dateOfBirth: stringify(item.driver_dob),
      nationality: stringify(item.driver_nationality),
    },
    Constructor: {
      constructorId: stringify(item.constructor_id),
      url: "",
      name: stringify(item.constructor_name),
      nationality: stringify(item.constructor_nationality),
    },
    grid: stringify(item.grid),
    laps: stringify(item.laps),
    status: stringify(item.status),
  };

  if (item.race_time_ms !== null && item.race_time_ms !== undefined) {
    result.Time = {
      millis: stringify(item.race_time_ms),
      time: formatMillis(item.race_time_ms),
    };
  }

  if (item.fastest_lap_time) {
    result.FastestLap = {
      rank: stringify(item.fastest_lap_rank),
      lap: "",
      Time: { time: stringify(item.fastest_lap_time) },
      AverageSpeed: item.fastest_lap_speed_kph
        ? {
            units: "kph",
            speed: stringify(item.fastest_lap_speed_kph),
          }
        : undefined,
    };
  }

  return result;
};

const normalizeRaceResults = (items) => {
  const races = new Map();

  for (const item of items) {
    if (item.data_type && item.data_type !== "race_results") continue;
    if (!item.season || !item.round || !item.race_name) continue;

    const key = `${item.season}-${item.round}`;
    if (!races.has(key)) {
      races.set(key, {
        season: stringify(item.season),
        round: stringify(item.round),
        url: "",
        raceName: stringify(item.race_name),
        Circuit: {
          circuitId: stringify(item.circuit_id),
          url: "",
          circuitName: stringify(item.circuit_name),
          Location: {
            lat: stringify(item.circuit_lat),
            long: stringify(item.circuit_long),
            locality: stringify(item.circuit_locality),
            country: stringify(item.circuit_country),
          },
        },
        date: stringify(item.race_date),
        time: stringify(item.race_time_utc),
        Results: [],
      });
    }

    if (item.driver_id) {
      races.get(key).Results.push(mapResult(item));
    }
  }

  return [...races.values()]
    .map((race) => ({
      ...race,
      Results: race.Results.sort(
        (a, b) => (Number(a.position) || 999) - (Number(b.position) || 999),
      ),
    }))
    .sort((a, b) => Number(a.round) - Number(b.round));
};

const fetchJolpicaJson = async (url) => {
  let resp;
  try {
    resp = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch (err) {
    throw httpError(502, `Could not reach Jolpica API: ${err.message}`);
  }

  if (!resp.ok) {
    const txt = await resp.text();
    throw httpError(502, `Jolpica request failed (${resp.status}): ${txt.slice(0, 200)}`);
  }

  return resp.json();
};

const fetchFromApify = async (season) => {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    // Fallback to Jolpica public API when APIFY_TOKEN is not configured
    return fetchFromJolpica(season);
  }

  const actorUrl = process.env.APIFY_ACTOR_URL || DEFAULT_ACTOR_URL;
  const url = new URL(actorUrl);
  url.searchParams.set("token", token);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataType: "race_results",
        season,
        maxItems: Number(process.env.APIFY_MAX_ITEMS || 600),
      }),
      signal: AbortSignal.timeout(Number(process.env.APIFY_TIMEOUT_MS || 120_000)),
    });
  } catch (error) {
    throw httpError(502, `Could not reach Apify: ${error.message}`);
  }

  if (!response.ok) {
    const details = await response.text();
    throw httpError(
      502,
      `Apify request failed (${response.status}): ${details.slice(0, 200)}`,
    );
  }

  const items = await response.json();
  if (!Array.isArray(items)) {
    throw httpError(502, "Apify returned an unexpected response");
  }

  return normalizeRaceResults(items);
};

const fetchFromJolpica = async (season) => {
  // Use the races endpoint to return the full schedule (not only results)
  const url = `${JOLPICA_API}/${season}/races.json`;
  const json = await fetchJolpicaJson(url);
  const races = json?.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) {
    throw httpError(502, "Jolpica returned an unexpected response");
  }

  return Promise.all(
    races.map(async (race) => {
      try {
        const resultJson = await fetchJolpicaJson(
          `${JOLPICA_API}/${season}/${race.round}/results.json`,
        );
        const resultRace = resultJson?.MRData?.RaceTable?.Races?.[0];
        return resultRace?.Results?.length
          ? { ...race, Results: resultRace.Results }
          : race;
      } catch {
        return race;
      }
    }),
  );
};

const getRaces = async (season) => {
  const cached = cache.get(season);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return { races: cached.races, cacheStatus: "HIT" };
  }

  try {
    const races = await fetchFromApify(season);
    cache.set(season, {
      races,
      expiresAt: now + getCacheTtlMs(),
    });
    return { races, cacheStatus: "MISS" };
  } catch (error) {
    if (cached) {
      return { races: cached.races, cacheStatus: "STALE" };
    }
    // If Apify failed and we have no cache, try the public Jolpica API as a fallback
    try {
      const races = await fetchFromJolpica(season);
      cache.set(season, {
        races,
        expiresAt: now + getCacheTtlMs(),
      });
      return { races, cacheStatus: "JOLPICA" };
    } catch {
      // If Jolpica also failed, throw the original error to preserve context
      throw error;
    }
  }
};

module.exports = {
  getRaces,
  normalizeRaceResults,
};
