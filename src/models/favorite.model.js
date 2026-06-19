const db = require("../config/database");

const upsertStatement = db.prepare(`
  INSERT INTO favorites (
    user_id, circuit_id, circuit_name, locality, country
  )
  VALUES (
    @userId, @circuitId, @circuitName, @locality, @country
  )
  ON CONFLICT(user_id, circuit_id)
  DO UPDATE SET
    circuit_name = excluded.circuit_name,
    locality = excluded.locality,
    country = excluded.country
`);

const findOneStatement = db.prepare(`
  SELECT
    id,
    circuit_id AS circuitId,
    circuit_name AS circuitName,
    locality,
    country,
    created_at AS createdAt
  FROM favorites
  WHERE user_id = ? AND circuit_id = ?
`);

const findByUserStatement = db.prepare(`
  SELECT
    id,
    circuit_id AS circuitId,
    circuit_name AS circuitName,
    locality,
    country,
    created_at AS createdAt
  FROM favorites
  WHERE user_id = ?
  ORDER BY created_at DESC
`);

const deleteStatement = db.prepare(`
  DELETE FROM favorites
  WHERE user_id = ? AND circuit_id = ?
`);

const FavoriteModel = {
  upsert(favorite) {
    upsertStatement.run(favorite);
    return findOneStatement.get(favorite.userId, favorite.circuitId);
  },

  findByUser(userId) {
    return findByUserStatement.all(userId);
  },

  deleteByUserAndCircuit(userId, circuitId) {
    return deleteStatement.run(userId, circuitId).changes;
  },
};

module.exports = FavoriteModel;
