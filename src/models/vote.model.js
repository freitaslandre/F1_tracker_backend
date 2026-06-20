const db = require("../config/database");

const votes = db.collection("votes");
const docId = (userId, season, round) => `${userId}_${season}_${round}`;
const nowIso = () => new Date().toISOString();

const normalizeVote = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: doc.id,
    raceSeason: data.raceSeason,
    raceRound: data.raceRound,
    raceName: data.raceName,
    driverId: data.driverId,
    driverName: data.driverName,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const VoteModel = {
  async upsert(vote) {
    const ref = votes.doc(docId(vote.userId, vote.raceSeason, vote.raceRound));
    const existing = await ref.get();
    const createdAt = existing.data()?.createdAt || nowIso();

    await ref.set({
      userId: Number(vote.userId),
      raceSeason: vote.raceSeason,
      raceRound: vote.raceRound,
      raceName: vote.raceName,
      driverId: vote.driverId,
      driverName: vote.driverName,
      createdAt,
      updatedAt: nowIso(),
    });

    return normalizeVote(await ref.get());
  },

  async findByUser(userId) {
    const snapshot = await votes.where("userId", "==", Number(userId)).get();
    return snapshot.docs
      .map(normalizeVote)
      .sort((a, b) =>
        Number(b.raceSeason) - Number(a.raceSeason) ||
        Number(a.raceRound) - Number(b.raceRound),
      );
  },

  async deleteByUserAndRace(userId, raceSeason, raceRound) {
    const ref = votes.doc(docId(userId, raceSeason, raceRound));
    const doc = await ref.get();
    if (!doc.exists) {
      return 0;
    }

    await ref.delete();
    return 1;
  },
};

module.exports = VoteModel;
