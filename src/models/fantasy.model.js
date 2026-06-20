const db = require("../config/database");

const findTeamByUserStatement = db.prepare(`
  SELECT id, user_id AS userId, budget_limit AS budgetLimit, budget_used AS budgetUsed,
         created_at AS createdAt, updated_at AS updatedAt
  FROM fantasy_teams
  WHERE user_id = ?
`);

const findItemsByTeamStatement = db.prepare(`
  SELECT id, item_type AS itemType, external_id AS externalId, name, team_name AS teamName,
         nationality, initials, price, points, position_index AS positionIndex
  FROM fantasy_team_items
  WHERE team_id = ?
  ORDER BY position_index ASC
`);

const upsertTeamStatement = db.prepare(`
  INSERT INTO fantasy_teams (user_id, budget_limit, budget_used, updated_at)
  VALUES (@userId, @budgetLimit, @budgetUsed, CURRENT_TIMESTAMP)
  ON CONFLICT(user_id) DO UPDATE SET
    budget_limit = excluded.budget_limit,
    budget_used = excluded.budget_used,
    updated_at = CURRENT_TIMESTAMP
`);

const deleteItemsStatement = db.prepare("DELETE FROM fantasy_team_items WHERE team_id = ?");

const insertItemStatement = db.prepare(`
  INSERT INTO fantasy_team_items (
    team_id, item_type, external_id, name, team_name, nationality, initials, price, points, position_index
  )
  VALUES (
    @teamId, @itemType, @externalId, @name, @teamName, @nationality, @initials, @price, @points, @positionIndex
  )
`);

const deleteTeamStatement = db.prepare("DELETE FROM fantasy_teams WHERE user_id = ?");

const leaderboardStatement = db.prepare(`
  SELECT
    users.id AS userId,
    users.name AS userName,
    fantasy_teams.id AS teamId,
    fantasy_teams.budget_used AS budgetUsed,
    fantasy_teams.updated_at AS updatedAt,
    COALESCE(SUM(fantasy_team_items.points), 0) AS basePoints,
    COALESCE(SUM(CASE WHEN fantasy_team_items.item_type = 'driver' THEN 1 ELSE 0 END), 0) AS driverCount,
    COALESCE(SUM(CASE WHEN fantasy_team_items.item_type = 'constructor' THEN 1 ELSE 0 END), 0) AS constructorCount
  FROM fantasy_teams
  JOIN users ON users.id = fantasy_teams.user_id
  LEFT JOIN fantasy_team_items ON fantasy_team_items.team_id = fantasy_teams.id
  GROUP BY fantasy_teams.id
  ORDER BY basePoints DESC, fantasy_teams.updated_at ASC
`);

const mapTeam = (team) => {
  if (!team) {
    return null;
  }

  const items = findItemsByTeamStatement.all(team.id);
  return {
    ...team,
    drivers: items.filter((item) => item.itemType === "driver"),
    constructors: items.filter((item) => item.itemType === "constructor"),
  };
};

const saveTransaction = db.transaction(({ userId, budgetLimit, budgetUsed, drivers, constructors }) => {
  upsertTeamStatement.run({ userId, budgetLimit, budgetUsed });
  const team = findTeamByUserStatement.get(userId);
  deleteItemsStatement.run(team.id);

  [...drivers, ...constructors].forEach((item) => {
    insertItemStatement.run({
      teamId: team.id,
      itemType: item.itemType,
      externalId: item.externalId,
      name: item.name,
      teamName: item.teamName || null,
      nationality: item.nationality || null,
      initials: item.initials,
      price: item.price,
      points: item.points,
      positionIndex: item.positionIndex,
    });
  });

  return mapTeam(findTeamByUserStatement.get(userId));
});

const FantasyModel = {
  findByUserId(userId) {
    return mapTeam(findTeamByUserStatement.get(userId));
  },

  save(payload) {
    return saveTransaction(payload);
  },

  deleteByUserId(userId) {
    deleteTeamStatement.run(userId);
  },

  leaderboard() {
    return leaderboardStatement.all().map((entry) => ({
      ...entry,
      projectedPoints: Number(entry.basePoints),
      isComplete: entry.driverCount === 5 && entry.constructorCount === 2,
    }));
  },
};

module.exports = FantasyModel;
