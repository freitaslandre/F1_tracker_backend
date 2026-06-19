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

const normalizeTeam = (team) => {
  if (!team) return null;

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

  save(team) {
    return saveTransaction(team);
  },

  deleteByUser(userId) {
    return deleteTeamStatement.run(userId).changes;
  },
};

module.exports = FantasyModel;
