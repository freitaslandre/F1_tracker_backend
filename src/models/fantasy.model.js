const db = require("../config/database");

const upsertTeamStatement = db.prepare(`
  INSERT INTO fantasy_teams (user_id, budget_limit, budget_used)
  VALUES (@userId, @budgetLimit, @budgetUsed)
  ON CONFLICT(user_id)
  DO UPDATE SET
    budget_limit = excluded.budget_limit,
    budget_used = excluded.budget_used,
    updated_at = CURRENT_TIMESTAMP
`);

const findTeamByUserStatement = db.prepare(`
  SELECT
    id,
    user_id AS userId,
    budget_limit AS budgetLimit,
    budget_used AS budgetUsed,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM fantasy_teams
  WHERE user_id = ?
`);

const findAllTeamsStatement = db.prepare(`
  SELECT
    id,
    user_id AS userId,
    budget_limit AS budgetLimit,
    budget_used AS budgetUsed,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM fantasy_teams
  ORDER BY updated_at ASC
`);

const deleteItemsStatement = db.prepare(`
  DELETE FROM fantasy_team_items
  WHERE team_id = ?
`);

const insertItemStatement = db.prepare(`
  INSERT INTO fantasy_team_items (
    team_id, item_type, external_id, name, team_name, nationality,
    initials, price, points, position_index
  )
  VALUES (
    @teamId, @itemType, @externalId, @name, @teamName, @nationality,
    @initials, @price, @points, @positionIndex
  )
`);

const findItemsByTeamStatement = db.prepare(`
  SELECT
    id,
    item_type AS itemType,
    external_id AS externalId,
    name,
    team_name AS teamName,
    nationality,
    initials,
    price,
    points,
    position_index AS positionIndex,
    created_at AS createdAt
  FROM fantasy_team_items
  WHERE team_id = ?
  ORDER BY item_type ASC, position_index ASC
`);

const deleteTeamStatement = db.prepare(`
  DELETE FROM fantasy_teams
  WHERE user_id = ?
`);

const upsertScoreStatement = db.prepare(`
  INSERT INTO fantasy_scores (
    team_id, user_id, race_season, race_round, race_name,
    base_points, race_points, total_points, details_json, updated_at
  )
  VALUES (
    @teamId, @userId, @raceSeason, @raceRound, @raceName,
    @basePoints, @racePoints, @totalPoints, @detailsJson, CURRENT_TIMESTAMP
  )
  ON CONFLICT(team_id, race_season, race_round)
  DO UPDATE SET
    race_name = excluded.race_name,
    base_points = excluded.base_points,
    race_points = excluded.race_points,
    total_points = excluded.total_points,
    details_json = excluded.details_json,
    updated_at = CURRENT_TIMESTAMP
`);

const findScoresByUserStatement = db.prepare(`
  SELECT
    id,
    race_season AS raceSeason,
    race_round AS raceRound,
    race_name AS raceName,
    base_points AS basePoints,
    race_points AS racePoints,
    total_points AS totalPoints,
    details_json AS detailsJson,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM fantasy_scores
  WHERE user_id = ?
  ORDER BY CAST(race_season AS INTEGER) DESC, CAST(race_round AS INTEGER) DESC
`);

const leaderboardStatement = db.prepare(`
  SELECT
    users.id AS userId,
    users.name AS userName,
    fantasy_teams.id AS teamId,
    fantasy_teams.budget_used AS budgetUsed,
    fantasy_teams.updated_at AS updatedAt,
    COALESCE(scores.basePoints, 0) AS basePoints,
    COALESCE(scores.racePoints, 0) AS racePoints,
    COALESCE(scores.totalPoints, 0) AS totalPoints,
    COALESCE(scores.scoredRaces, 0) AS scoredRaces,
    COALESCE(items.driverCount, 0) AS driverCount,
    COALESCE(items.constructorCount, 0) AS constructorCount
  FROM fantasy_teams
  JOIN users ON users.id = fantasy_teams.user_id
  LEFT JOIN (
    SELECT team_id, SUM(base_points) AS basePoints, SUM(race_points) AS racePoints,
           SUM(total_points) AS totalPoints, COUNT(*) AS scoredRaces
    FROM fantasy_scores
    GROUP BY team_id
  ) scores ON scores.team_id = fantasy_teams.id
  LEFT JOIN (
    SELECT team_id,
           SUM(CASE WHEN item_type = 'driver' THEN 1 ELSE 0 END) AS driverCount,
           SUM(CASE WHEN item_type = 'constructor' THEN 1 ELSE 0 END) AS constructorCount
    FROM fantasy_team_items
    GROUP BY team_id
  ) items ON items.team_id = fantasy_teams.id
  ORDER BY totalPoints DESC, racePoints DESC, fantasy_teams.updated_at ASC
`);

const normalizeTeam = (team) => {
  if (!team) return null;

  const items = findItemsByTeamStatement.all(team.id);
  return {
    ...team,
    drivers: items.filter((item) => item.itemType === "driver"),
    constructors: items.filter((item) => item.itemType === "constructor"),
  };
};

const normalizeScore = (score) => ({
  ...score,
  details: JSON.parse(score.detailsJson || "[]"),
  detailsJson: undefined,
});

const scoreTransaction = db.transaction((scores) => {
  scores.forEach((score) => upsertScoreStatement.run(score));
});

const saveTransaction = db.transaction(({ userId, budgetLimit, budgetUsed, drivers, constructors }) => {
  upsertTeamStatement.run({ userId, budgetLimit, budgetUsed });
  const team = findTeamByUserStatement.get(userId);

  deleteItemsStatement.run(team.id);

  drivers.forEach((driver, index) => {
    insertItemStatement.run({
      teamId: team.id,
      itemType: "driver",
      externalId: driver.id,
      name: driver.name,
      teamName: driver.team,
      nationality: "",
      initials: driver.initials,
      price: driver.price,
      points: driver.points,
      positionIndex: index,
    });
  });

  constructors.forEach((constructor, index) => {
    insertItemStatement.run({
      teamId: team.id,
      itemType: "constructor",
      externalId: constructor.id,
      name: constructor.name,
      teamName: "",
      nationality: constructor.nationality,
      initials: constructor.initials,
      price: constructor.price,
      points: constructor.points,
      positionIndex: index,
    });
  });

  return normalizeTeam(findTeamByUserStatement.get(userId));
});

const FantasyModel = {
  findByUser(userId) {
    return normalizeTeam(findTeamByUserStatement.get(userId));
  },

  findAllTeams() {
    return findAllTeamsStatement.all().map(normalizeTeam);
  },

  save(team) {
    return saveTransaction(team);
  },

  deleteByUser(userId) {
    return deleteTeamStatement.run(userId).changes;
  },

  saveScores(scores) {
    scoreTransaction(scores);
    return scores;
  },

  findScoresByUser(userId) {
    return findScoresByUserStatement.all(userId).map(normalizeScore);
  },

  leaderboard() {
    return leaderboardStatement.all().map((entry) => ({
      ...entry,
      projectedPoints: Number(entry.totalPoints),
      isComplete: entry.driverCount >= 5 && entry.constructorCount >= 2,
    }));
  },
};

module.exports = FantasyModel;
