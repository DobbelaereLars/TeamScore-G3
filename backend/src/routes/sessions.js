const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// Helper to run query as promise
const run = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

router.get('/', async (req, res) => {
  const db = getDatabase();
  try {
    const query = `
      SELECT 
        Session.*, 
        (SELECT COUNT(*) FROM Participant WHERE session_id = Session.id AND type = CASE WHEN Session.participant_mode = 'players' THEN 'player' ELSE 'team' END) as participant_count
      FROM Session 
      ORDER BY created_at DESC
    `;
    const sessions = await all(db, query);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const db = getDatabase();
  const {
    sessionName,
    participantMode,
    gameMode,
    games,
    participants,
    status,
  } = req.body;

  try {
    // Start transaction
    await run(db, 'BEGIN TRANSACTION');

    // 1. Create Session
    // Map frontend modes to DB enum values
    // participantMode: players, teams, teams-with-players -> players, teams, teams_with_players
    // gameMode: single-game, series-of-games, parallel-games -> single, series, parallel

    const dbParticipantMode =
      participantMode === 'teams-with-players'
        ? 'teams_with_players'
        : participantMode;
    const dbGameMode =
      gameMode === 'single-game'
        ? 'single'
        : gameMode === 'series-of-games'
          ? 'series'
          : 'parallel';

    // Default status is 'created' via DB default, but can be overridden
    const sessionStatus = status || 'created';

    const sessionResult = await run(
      db,
      `INSERT INTO Session (name, participant_mode, game_mode, status) VALUES (?, ?, ?, ?)`,
      [
        sessionName || 'Nieuwe sessie',
        dbParticipantMode,
        dbGameMode,
        sessionStatus,
      ],
    );
    const sessionId = sessionResult.lastID;

    // 2. Create Participants (and Players/Teams)
    // Map frontend ID to DB Participant ID for linking to games later
    // For teams-with-players, we map both Team ID and Player IDs
    const participantIdMap = {}; // frontendId -> dbParticipantId (for regular/team mode)
    const teamHasPlayersMap = {}; // frontendTeamId -> [dbParticipantIdOfPlayer1, ...]

    for (const p of participants) {
      if (participantMode === 'players') {
        const playerResult = await run(
          db,
          `INSERT INTO Player (name) VALUES (?)`,
          [p.name],
        );
        const participantTypeId = playerResult.lastID;

        const partResult = await run(
          db,
          `INSERT INTO Participant (session_id, type, player_id) VALUES (?, ?, ?)`,
          [sessionId, 'player', participantTypeId],
        );
        participantIdMap[p.id] = partResult.lastID;
      } else if (participantMode === 'teams') {
        const teamResult = await run(db, `INSERT INTO Team (name) VALUES (?)`, [
          p.name,
        ]);
        const participantTypeId = teamResult.lastID;

        const partResult = await run(
          db,
          `INSERT INTO Participant (session_id, type, team_id) VALUES (?, ?, ?)`,
          [sessionId, 'team', participantTypeId],
        );
        participantIdMap[p.id] = partResult.lastID;
      } else if (participantMode === 'teams-with-players') {
        // Create Team
        const teamResult = await run(db, `INSERT INTO Team (name) VALUES (?)`, [
          p.name,
        ]);
        const teamId = teamResult.lastID;

        // We DON'T create a Participant for the Team itself if players score individually.
        // OR we do, but we ensure scoring uses the Player Participants.
        // Let's create the Team participant for completeness (e.g. for display purposes to list teams),
        // but store players for scoring.
        const teamPartRes = await run(
          db,
          `INSERT INTO Participant (session_id, type, team_id) VALUES (?, ?, ?)`,
          [sessionId, 'team', teamId],
        );
        // Map the TEAM ID as well
        participantIdMap[p.id] = teamPartRes.lastID;

        teamHasPlayersMap[p.id] = [];

        if (p.players) {
          for (const tp of p.players) {
            // Create Player
            const subPlayerResult = await run(
              db,
              `INSERT INTO Player (name) VALUES (?)`,
              [tp.name],
            );
            const subPlayerId = subPlayerResult.lastID;

            // Link to Team
            await run(
              db,
              `INSERT INTO TeamPlayer (team_id, player_id) VALUES (?, ?)`,
              [teamId, subPlayerId],
            );

            // Create Participant for Player (so they can score)
            // Nu slaan we ook het team_id op in de Participant rij voor makkelijkere aggregatie
            const playerPartRes = await run(
              db,
              `INSERT INTO Participant (session_id, type, player_id, team_id) VALUES (?, ?, ?, ?)`,
              [sessionId, 'player', subPlayerId, teamId],
            );
            teamHasPlayersMap[p.id].push(playerPartRes.lastID);
          }
        }
      }
    }

    // 3. Create Games and ScoreModels
    // Map frontend Game ID to DB Game ID
    const gameIdMap = {}; // frontendGameId -> dbGameId

    for (const g of games) {
      // Create ScoreModel
      // g.scoreModel -> points, time, completed -> DB: points, time, boolean
      let dbScoreType = 'points';
      if (g.scoreModel === 'time') dbScoreType = 'time';
      if (g.scoreModel === 'completed') dbScoreType = 'boolean';

      // ranking: highest-first -> highest_wins, lowest-first -> lowest_wins
      // time: fastest-first -> lowest_wins (usually time is duration), slowest-first -> highest_wins (endurance?)
      // BUT check what frontend sends.
      // pointsRanking: 'highest-first', 'lowest-first'
      // timeRanking: 'fastest-first' (less time is better -> lowest wins), 'slowest-first' (more time is better -> highest wins)

      let rankingRule = 'highest_wins';
      if (dbScoreType === 'points') {
        rankingRule =
          g.pointsRanking === 'lowest-first' ? 'lowest_wins' : 'highest_wins';
      } else if (dbScoreType === 'time') {
        rankingRule =
          g.timeRanking === 'fastest-first' ? 'lowest_wins' : 'highest_wins'; // Time: lower is usually better (fastest)
      }

      // Config JSON
      const config = {
        pointsPerAction: g.pointsPerAction,
        bonusPoints: g.useBonusPoints ? g.bonusPoints : 0,
        timeBonusPoints: g.useTimeBonusPoints ? g.timeBonusPoints : 0,
        timeNotation: g.timeNotation,
        setsCount: g.useSets ? g.setsCount : 1, // Store here or rely on Game columns? Game has rounds/sets cols.
      };

      const scoreModelResult = await run(
        db,
        `INSERT INTO ScoreModel (type, has_bonus, ranking_rule, config_json) VALUES (?, ?, ?, ?)`,
        [
          dbScoreType,
          g.useBonusPoints || g.useTimeBonusPoints ? 1 : 0,
          rankingRule,
          JSON.stringify(config),
        ],
      );
      const scoreModelId = scoreModelResult.lastID;

      // Create Game
      const gameResult = await run(
        db,
        `INSERT INTO Game (session_id, name, rounds, sets, score_model_id) VALUES (?, ?, ?, ?, ?)`,
        [
          sessionId,
          g.name || g.id.replace('game-', 'Spel '), // Fallback name
          g.useRounds ? g.roundsCount : 1,
          g.useSets ? g.setsCount : 1,
          scoreModelId,
        ],
      );
      const gameId = gameResult.lastID;
      gameIdMap[g.id] = gameId;
    }

    // 4. Assign Participants to Games (Parallel Mode or cleanup)
    // If parallel, specific assignments. If single/series, all participants are in all games (typically).
    // Or do we assign them implicitly?
    // Let's create initial Score entries for assigned participants.

    if (dbGameMode === 'parallel') {
      for (const p of participants) {
        // p.assignedGameId is set in frontend for parallel games
        // Handle teams-with-players assignment: assigning a team assigns all its players
        if (
          participantMode === 'teams-with-players' &&
          p.assignedGameId &&
          gameIdMap[p.assignedGameId]
        ) {
          const playerPartIds = teamHasPlayersMap[p.id] || [];
          const dbGameId = gameIdMap[p.assignedGameId];
          for (const partId of playerPartIds) {
            await run(
              db,
              `INSERT INTO Score (game_id, participant_id) VALUES (?, ?)`,
              [dbGameId, partId],
            );
          }
        } else if (
          p.assignedGameId &&
          gameIdMap[p.assignedGameId] &&
          participantIdMap[p.id]
        ) {
          await run(
            db,
            `INSERT INTO Score (game_id, participant_id) VALUES (?, ?)`,
            [gameIdMap[p.assignedGameId], participantIdMap[p.id]],
          );
        }
      }
    } else {
      // Single or Series: Assign ALL participants to ALL games
      // Is this desired? Usually yes.
      for (const g of games) {
        const dbGameId = gameIdMap[g.id];

        if (participantMode === 'teams-with-players') {
          // Assign ALL individual players to the game
          for (const p of participants) {
            const playerPartIds = teamHasPlayersMap[p.id] || [];
            for (const partId of playerPartIds) {
              await run(
                db,
                `INSERT INTO Score (game_id, participant_id) VALUES (?, ?)`,
                [dbGameId, partId],
              );
            }
          }
        } else {
          for (const p of participants) {
            const dbPartId = participantIdMap[p.id];
            await run(
              db,
              `INSERT INTO Score (game_id, participant_id) VALUES (?, ?)`,
              [dbGameId, dbPartId],
            );
          }
        }
      }
    }

    await run(db, 'COMMIT');
    res.json({ success: true, sessionId });
  } catch (error) {
    await run(db, 'ROLLBACK');
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
