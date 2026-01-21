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

// GET all sessions
router.get('/', async (req, res) => {
  const db = getDatabase();
  try {
    const query = `
      SELECT 
        s.*,
        (
          SELECT COUNT(DISTINCT 
            CASE 
              WHEN s.participant_mode = 'players' THEN p.player_id
              ELSE p.team_id 
            END
          )
          FROM Participant p
          JOIN Game g ON p.game_id = g.id
          WHERE g.session_id = s.id
        ) as participant_count
      FROM Session s
      ORDER BY s.created_at DESC
    `;
    const sessions = await all(db, query);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET session by ID
router.get('/:id', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  try {
    const session = await get(db, 'SELECT * FROM Session WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET games for a session with details
router.get('/:id/games', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  try {
    const games = await all(
      db,
      `
            SELECT g.*, sm.type as score_type, sm.ranking_rule, sm.config_json as score_config
            FROM Game g
            JOIN ScoreModel sm ON g.score_model_id = sm.id
            WHERE g.session_id = ?
        `,
      [id],
    );

    if (games.length === 0) {
      return res.json([]);
    }

    const gameIds = games.map((g) => g.id);
    const placeholders = gameIds.map(() => '?').join(',');

    const scoreQuery = `
            SELECT
                s.game_id,
                s.value_number,
                s.value_time,
                s.value_bool,
                p.id as participant_id,
                pl.id as player_id,
                pl.name as player_name,
                t.id as team_id,
                t.name as team_name
            FROM Score s
            JOIN Participant p ON s.participant_id = p.id
            LEFT JOIN Player pl ON p.player_id = pl.id
            LEFT JOIN Team t ON p.team_id = t.id
            WHERE s.game_id IN (${placeholders})
        `;

    const scores = await all(db, scoreQuery, gameIds);

    const gamesWithDetails = games.map((game) => {
      const gameScores = scores.filter((s) => s.game_id === game.id);
      const players = gameScores.map((s) => ({
        id: s.player_id || s.team_id,
        name: s.player_name || s.team_name || 'Unknown',
        points: s.value_number || 0,
        time: s.value_time || 0,
        bool: s.value_bool || 0,
        participantId: s.participant_id,
      }));

      return {
        ...game,
        perClick: game.points_per_click || 1,
        currentRound: game.current_round || 1,
        currentSet: game.current_set || 1,
        players: players,
      };
    });

    res.json(gamesWithDetails);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET final scores for a session (Leaderboard)
router.get('/:id/final-scores', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        fs.participant_id,
        fs.total_points,
        fs.final_rank,
        p.id as participant_id,
        p.type as participant_type,
        pl.name as player_name,
        tm.name as team_name
      FROM FinalScore fs
      JOIN Participant p ON fs.participant_id = p.id
      LEFT JOIN Player pl ON p.player_id = pl.id
      LEFT JOIN Team tm ON p.team_id = tm.id
      WHERE fs.session_id = ?
      ORDER BY fs.total_points DESC
    `;

    const scores = await all(db, query, [id]);
    res.json(scores);
  } catch (error) {
    console.error('Error fetching final scores:', error);
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
    await run(db, 'BEGIN TRANSACTION');

    // 1. Create Session
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

    // 2. Create Global Entities (Players/Teams)
    const entityMap = {};

    for (const p of participants) {
      if (participantMode === 'players') {
        const res = await run(db, `INSERT INTO Player (name) VALUES (?)`, [
          p.name,
        ]);
        entityMap[p.id] = { id: res.lastID, type: 'player' };
      } else if (participantMode === 'teams') {
        const res = await run(db, `INSERT INTO Team (name) VALUES (?)`, [
          p.name,
        ]);
        entityMap[p.id] = { id: res.lastID, type: 'team' };
      } else if (participantMode === 'teams-with-players') {
        const teamRes = await run(db, `INSERT INTO Team (name) VALUES (?)`, [
          p.name,
        ]);
        const teamId = teamRes.lastID;
        const subPlayers = [];

        if (p.players) {
          for (const sub of p.players) {
            const plRes = await run(
              db,
              `INSERT INTO Player (name) VALUES (?)`,
              [sub.name],
            );
            await run(
              db,
              `INSERT INTO TeamPlayer (team_id, player_id) VALUES (?, ?)`,
              [teamId, plRes.lastID],
            );
            subPlayers.push(plRes.lastID);
          }
        }
        entityMap[p.id] = { id: teamId, type: 'team', subPlayers };
      }
    }

    // 3. Create Games and ScoreModels
    const gameIdMap = {};

    for (const g of games) {
      let dbScoreType = 'points';
      if (g.scoreModel === 'time') dbScoreType = 'time';
      if (g.scoreModel === 'completed') dbScoreType = 'boolean';

      let rankingRule = 'highest_wins';
      if (dbScoreType === 'points') {
        rankingRule =
          g.pointsRanking === 'lowest-first' ? 'lowest_wins' : 'highest_wins';
      } else if (dbScoreType === 'time') {
        rankingRule =
          g.timeRanking === 'fastest-first' ? 'lowest_wins' : 'highest_wins';
      }

      const config = {
        pointsPerAction: g.pointsPerAction,
        bonusPoints: g.useBonusPoints ? g.bonusPoints : 0,
        timeBonusPoints: g.useTimeBonusPoints ? g.timeBonusPoints : 0,
        timeNotation: g.timeNotation,
        setsCount: g.useSets ? g.setsCount : 1,
      };

      const smRes = await run(
        db,
        `INSERT INTO ScoreModel (type, has_bonus, ranking_rule, config_json) VALUES (?, ?, ?, ?)`,
        [
          dbScoreType,
          g.useBonusPoints || g.useTimeBonusPoints ? 1 : 0,
          rankingRule,
          JSON.stringify(config),
        ],
      );

      const gameRes = await run(
        db,
        `INSERT INTO Game (session_id, name, rounds, sets, score_model_id, points_per_click, bonus_points) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          g.name || g.id.replace('game-', 'Spel '),
          g.useRounds ? g.roundsCount : 1,
          g.useSets ? g.setsCount : 1,
          smRes.lastID,
          g.pointsPerAction ? parseFloat(g.pointsPerAction) : null,
          g.useBonusPoints ? parseFloat(g.bonusPoints) : null,
        ],
      );
      gameIdMap[g.id] = gameRes.lastID;
    }

    // 4. Create Participants (linked to Game) and Scores
    for (const g of games) {
      const dbGameId = gameIdMap[g.id];
      let assignments = [];

      if (dbGameMode === 'parallel') {
        assignments = participants
          .filter((p) => p.assignedGameId === g.id)
          .map((p) => p.id);
      } else {
        assignments = participants.map((p) => p.id);
      }

      for (const entityId of assignments) {
        const entity = entityMap[entityId];
        if (!entity) continue;

        if (participantMode === 'teams-with-players') {
          for (const subPlayerId of entity.subPlayers) {
            const partRes = await run(
              db,
              `INSERT INTO Participant (game_id, type, player_id, team_id) VALUES (?, ?, ?, ?)`,
              [dbGameId, 'player', subPlayerId, entity.id],
            );

            await run(
              db,
              `INSERT INTO Score (game_id, participant_id) VALUES (?, ?)`,
              [dbGameId, partRes.lastID],
            );

            // Initialize FinalScore for this participant in this session
            await run(
              db,
              `INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)`,
              [sessionId, partRes.lastID],
            );
          }
        } else if (participantMode === 'players') {
          const partRes = await run(
            db,
            `INSERT INTO Participant (game_id, type, player_id) VALUES (?, ?, ?)`,
            [dbGameId, 'player', entity.id],
          );
          await run(
            db,
            `INSERT INTO Score (game_id, participant_id) VALUES (?, ?)`,
            [dbGameId, partRes.lastID],
          );

          // Initialize FinalScore for this participant in this session
          await run(
            db,
            `INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)`,
            [sessionId, partRes.lastID],
          );
        } else if (participantMode === 'teams') {
          const partRes = await run(
            db,
            `INSERT INTO Participant (game_id, type, team_id) VALUES (?, ?, ?)`,
            [dbGameId, 'team', entity.id],
          );
          await run(
            db,
            `INSERT INTO Score (game_id, participant_id) VALUES (?, ?)`,
            [dbGameId, partRes.lastID],
          );

          // Initialize FinalScore for this participant in this session
          await run(
            db,
            `INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)`,
            [sessionId, partRes.lastID],
          );
        }
      }
    }

    await run(db, 'COMMIT');
    res.json({ success: true, id: sessionId });
  } catch (error) {
    await run(db, 'ROLLBACK');
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
