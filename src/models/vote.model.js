const db = require("../config/database");

const upsertStatement = db.prepare(`
  INSERT INTO votes (
    user_id, race_season, race_round, race_name, driver_id, driver_name
  )
  VALUES (
    @userId, @raceSeason, @raceRound, @raceName, @driverId, @driverName
  )
  ON CONFLICT(user_id, race_season, race_round)
  DO UPDATE SET
    race_name = excluded.race_name,
    driver_id = excluded.driver_id,
    driver_name = excluded.driver_name,
    updated_at = CURRENT_TIMESTAMP
`);

const findOneStatement = db.prepare(`
  SELECT
    id,
    race_season AS raceSeason,
    race_round AS raceRound,
    race_name AS raceName,
    driver_id AS driverId,
    driver_name AS driverName,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM votes
  WHERE user_id = ? AND race_season = ? AND race_round = ?
`);

const findByUserStatement = db.prepare(`
  SELECT
    id,
    race_season AS raceSeason,
    race_round AS raceRound,
    race_name AS raceName,
    driver_id AS driverId,
    driver_name AS driverName,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM votes
  WHERE user_id = ?
  ORDER BY CAST(race_season AS INTEGER) DESC, CAST(race_round AS INTEGER) ASC
`);

const deleteStatement = db.prepare(`
  DELETE FROM votes
  WHERE user_id = ? AND race_season = ? AND race_round = ?
`);

const VoteModel = {
  upsert(vote) {
    upsertStatement.run(vote);
    return findOneStatement.get(vote.userId, vote.raceSeason, vote.raceRound);
  },

  findByUser(userId) {
    return findByUserStatement.all(userId);
  },

  deleteByUserAndRace(userId, raceSeason, raceRound) {
    return deleteStatement.run(userId, raceSeason, raceRound).changes;
  },
};

module.exports = VoteModel;
