const db = require("../config/database");

const teams = db.collection("fantasy_teams");
const scores = db.collection("fantasy_scores");
const users = db.collection("users");
const nowIso = () => new Date().toISOString();

const teamDocId = (userId) => String(userId);
const scoreDocId = (teamId, raceSeason, raceRound) => `${teamId}_${raceSeason}_${raceRound}`;

const normalizeTeam = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    id: Number(doc.id),
    userId: Number(data.userId),
    budgetLimit: data.budgetLimit,
    budgetUsed: data.budgetUsed,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    drivers: data.drivers || [],
    constructors: data.constructors || [],
  };
};

const normalizeScore = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    raceSeason: data.raceSeason,
    raceRound: data.raceRound,
    raceName: data.raceName,
    basePoints: data.basePoints,
    racePoints: data.racePoints,
    totalPoints: data.totalPoints,
    details: data.details || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const fantasyItem = (item, itemType, positionIndex) => ({
  id: `${itemType}-${item.id}`,
  itemType,
  externalId: item.id,
  name: item.name,
  teamName: item.team || "",
  nationality: item.nationality || "",
  initials: item.initials,
  price: Number(item.price),
  points: Number(item.points),
  positionIndex,
  createdAt: nowIso(),
});

const FantasyModel = {
  async findByUser(userId) {
    return normalizeTeam(await teams.doc(teamDocId(userId)).get());
  },

  async findAllTeams() {
    const snapshot = await teams.get();
    return snapshot.docs
      .map(normalizeTeam)
      .filter(Boolean)
      .sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
  },

  async save({ userId, budgetLimit, budgetUsed, drivers, constructors }) {
    const ref = teams.doc(teamDocId(userId));
    const existing = await ref.get();
    const createdAt = existing.data()?.createdAt || nowIso();
    const updatedAt = nowIso();

    await ref.set({
      userId: Number(userId),
      budgetLimit: Number(budgetLimit),
      budgetUsed: Number(budgetUsed),
      createdAt,
      updatedAt,
      drivers: drivers.map((driver, index) => fantasyItem(driver, "driver", index)),
      constructors: constructors.map((constructor, index) =>
        fantasyItem(constructor, "constructor", index),
      ),
    });

    return normalizeTeam(await ref.get());
  },

  async deleteByUser(userId) {
    const ref = teams.doc(teamDocId(userId));
    const doc = await ref.get();
    if (!doc.exists) {
      return 0;
    }

    await ref.delete();
    return 1;
  },

  async saveScores(newScores) {
    if (newScores.length === 0) {
      return newScores;
    }

    const batch = db.batch();
    const updatedAt = nowIso();

    newScores.forEach((score) => {
      const ref = scores.doc(scoreDocId(score.teamId, score.raceSeason, score.raceRound));
      batch.set(ref, {
        teamId: Number(score.teamId),
        userId: Number(score.userId),
        raceSeason: score.raceSeason,
        raceRound: score.raceRound,
        raceName: score.raceName,
        basePoints: Number(score.basePoints),
        racePoints: Number(score.racePoints),
        totalPoints: Number(score.totalPoints),
        details: JSON.parse(score.detailsJson || "[]"),
        createdAt: updatedAt,
        updatedAt,
      }, { merge: true });
    });

    await batch.commit();
    return newScores;
  },

  async findScoresByUser(userId) {
    const snapshot = await scores.where("userId", "==", Number(userId)).get();
    return snapshot.docs
      .map(normalizeScore)
      .sort((a, b) =>
        Number(b.raceSeason) - Number(a.raceSeason) ||
        Number(b.raceRound) - Number(a.raceRound),
      );
  },

  async leaderboard() {
    const [teamList, scoreSnapshot] = await Promise.all([
      this.findAllTeams(),
      scores.get(),
    ]);
    const scoresByTeam = scoreSnapshot.docs.reduce((acc, doc) => {
      const score = doc.data();
      const teamId = Number(score.teamId);
      const current = acc[teamId] || {
        basePoints: 0,
        racePoints: 0,
        totalPoints: 0,
        scoredRaces: 0,
      };

      acc[teamId] = {
        basePoints: current.basePoints + Number(score.basePoints || 0),
        racePoints: current.racePoints + Number(score.racePoints || 0),
        totalPoints: current.totalPoints + Number(score.totalPoints || 0),
        scoredRaces: current.scoredRaces + 1,
      };
      return acc;
    }, {});

    const entries = await Promise.all(teamList.map(async (team) => {
      const userDoc = await users.doc(String(team.userId)).get();
      const user = userDoc.data() || {};
      const score = scoresByTeam[team.id] || {
        basePoints: 0,
        racePoints: 0,
        totalPoints: 0,
        scoredRaces: 0,
      };

      return {
        userId: team.userId,
        userName: user.name || "F1 Fan",
        teamId: team.id,
        budgetUsed: team.budgetUsed,
        updatedAt: team.updatedAt,
        ...score,
        projectedPoints: Number(score.totalPoints),
        driverCount: team.drivers.length,
        constructorCount: team.constructors.length,
        isComplete: team.drivers.length >= 5 && team.constructors.length >= 2,
      };
    }));

    return entries.sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      b.racePoints - a.racePoints ||
      String(a.updatedAt).localeCompare(String(b.updatedAt)),
    );
  },
};

module.exports = FantasyModel;
