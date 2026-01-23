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
        team_id: s.team_id,
        team_name: s.team_name,
        name: s.player_name || s.team_name || 'Unknown',
        points: s.value_number || 0,
        time: s.value_time || 0,
        bool: s.value_bool || 0,
        participantId: s.participant_id,
      }));

      let scoreConfig = {};
      try {
        scoreConfig = JSON.parse(game.score_config || '{}');
      } catch (e) {
        console.error('Failed to parse score_config', e);
      }

      return {
        ...game,
        perClick: game.points_per_click || 1,
        currentRound: game.current_round || 1,
        currentSet: game.current_set || 1,
        use_sets: game.sets > 1, // Derived from DB column
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
        MAX(p.id) as participant_id,
        SUM(fs.total_points) as total_points,
        MIN(fs.final_rank) as final_rank,
        p.type as participant_type,
        MAX(pl.name) as player_name,
        MAX(tm.name) as team_name
      FROM FinalScore fs
      JOIN Participant p ON fs.participant_id = p.id
      LEFT JOIN Player pl ON p.player_id = pl.id
      LEFT JOIN Team tm ON p.team_id = tm.id
      WHERE fs.session_id = ?
      GROUP BY p.type, COALESCE(pl.id, tm.id)
      ORDER BY total_points DESC
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
        useSets: g.useSets, // Explicitly save the toggle state
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

// PUT /api/sessions/:id
// Update session info (e.g. status)
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { status, sessionName } = req.body;

  let fields = [];
  let values = [];

  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }

  if (sessionName !== undefined) {
    fields.push('name = ?');
    values.push(sessionName);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  const query = `UPDATE Session SET ${fields.join(', ')} WHERE id = ?`;

  db.run(query, values, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes });
  });
});

// DELETE session
router.delete('/:id', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  try {
    // Enable foreign keys for this connection to ensure ON DELETE CASCADE works
    await run(db, 'PRAGMA foreign_keys = ON');
    await run(db, 'BEGIN TRANSACTION');

    // 1. Fetch info for cleanup of non-cascaded entities (ScoreModel)
    const games = await all(
      db,
      'SELECT score_model_id FROM Game WHERE session_id = ?',
      [id],
    );
    const scoreModelIds = games
      .map((g) => g.score_model_id)
      .filter((mid) => mid);

    // 2. Fetch involved participants (Players and Teams) to check for orphans
    const participants = await all(
      db,
      `SELECT DISTINCT p.player_id, p.team_id 
       FROM Participant p
       JOIN Game g ON p.game_id = g.id
       WHERE g.session_id = ?`,
      [id],
    );
    const playerIds = [
      ...new Set(participants.map((p) => p.player_id).filter((id) => id)),
    ];
    const teamIds = [
      ...new Set(participants.map((p) => p.team_id).filter((id) => id)),
    ];

    // 3. Delete the session (Cascades to Game, Participant, Score, FinalScore)
    await run(db, 'DELETE FROM Session WHERE id = ?', [id]);

    // 4. Clean up orphaned ScoreModels
    if (scoreModelIds.length > 0) {
      const placeholders = scoreModelIds.map(() => '?').join(',');
      await run(
        db,
        `DELETE FROM ScoreModel WHERE id IN (${placeholders})`,
        scoreModelIds,
      );
    }

    // 5. Clean up orphaned Teams
    for (const teamId of teamIds) {
      const usage = await get(
        db,
        'SELECT 1 FROM Participant WHERE team_id = ? LIMIT 1',
        [teamId],
      );
      if (!usage) {
        await run(db, 'DELETE FROM Team WHERE id = ?', [teamId]);
      }
    }

    // 6. Clean up orphaned Players
    for (const playerId of playerIds) {
      const participantUsage = await get(
        db,
        'SELECT 1 FROM Participant WHERE player_id = ? LIMIT 1',
        [playerId],
      );

      if (participantUsage) continue; // Still playing in a game

      const teamUsage = await get(
        db,
        'SELECT 1 FROM TeamPlayer WHERE player_id = ? LIMIT 1',
        [playerId],
      );

      if (!teamUsage) {
        await run(db, 'DELETE FROM Player WHERE id = ?', [playerId]);
      }
    }

    await run(db, 'COMMIT');
    res.json({ success: true });
  } catch (error) {
    await run(db, 'ROLLBACK');
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/participants
// Add new participants to an existing session
router.post('/:id/participants', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { newParticipants, newSubPlayers } = req.body;

  // Check session validity & modes
  try {
    const session = await get(db, 'SELECT * FROM Session WHERE id = ?', [id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const games = await all(db, 'SELECT id FROM Game WHERE session_id = ?', [
      id,
    ]);
    if (!games.length)
      return res.status(400).json({ error: 'No games in session' });
    const gameIds = games.map((g) => g.id);
    const gameMode = session.game_mode;

    // Helper: Determine target games for a participant
    // If assignedGameId provided (parallel), use it. Else use ALL games (series/single).
    const getTargetGameIds = (assignedGameId) => {
      if (gameMode === 'parallel' && assignedGameId) {
        // Verify strict validity? Or just trust frontend?
        // For safety, check if assignedGameId is in our session's games
        // Note: assignedGameId from frontend might necessarily match if it was just passed through.
        // But newly created participants in parallel mode need an assignment.
        // If frontend sends assignedGameId, use it.
        return [assignedGameId];
      }
      return gameIds;
    };

    // 1. Handle New Top Level Participants
    if (newParticipants && newParticipants.length > 0) {
      for (const p of newParticipants) {
        const targetGames = getTargetGameIds(p.assignedGameId);
        if (targetGames.length === 0) continue; // Should not happen if logic correct

        // Create Global Entity
        let entityId;
        if (session.participant_mode === 'players') {
          const r = await run(db, 'INSERT INTO Player (name) VALUES (?)', [
            p.name,
          ]);
          entityId = r.lastID;
        } else {
          // teams or teams_with_players
          const r = await run(db, 'INSERT INTO Team (name) VALUES (?)', [
            p.name,
          ]);
          entityId = r.lastID;
        }

        // If teams_with_players, handle sub-players immediately for this new team
        let subPlayerIds = [];
        if (session.participant_mode === 'teams_with_players') {
          if (p.players && p.players.length > 0) {
            for (const sub of p.players) {
              const plRes = await run(
                db,
                'INSERT INTO Player (name) VALUES (?)',
                [sub.name],
              );
              await run(
                db,
                'INSERT INTO TeamPlayer (team_id, player_id) VALUES (?, ?)',
                [entityId, plRes.lastID],
              );
              subPlayerIds.push(plRes.lastID);
            }
          }
        }

        // Create Participants & Scores for target games
        for (const gid of targetGames) {
          if (session.participant_mode === 'teams_with_players') {
            // Create participant for each sub-player linked to team
            for (const pid of subPlayerIds) {
              const partRes = await run(
                db,
                'INSERT INTO Participant (game_id, type, player_id, team_id) VALUES (?, ?, ?, ?)',
                [gid, 'player', pid, entityId],
              );
              await run(
                db,
                'INSERT INTO Score (game_id, participant_id) VALUES (?, ?)',
                [gid, partRes.lastID],
              );
              await run(
                db,
                'INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)',
                [id, partRes.lastID],
              );
            }
          } else if (session.participant_mode === 'players') {
            const partRes = await run(
              db,
              'INSERT INTO Participant (game_id, type, player_id) VALUES (?, ?, ?)',
              [gid, 'player', entityId],
            );
            await run(
              db,
              'INSERT INTO Score (game_id, participant_id) VALUES (?, ?)',
              [gid, partRes.lastID],
            );
            await run(
              db,
              'INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)',
              [id, partRes.lastID],
            );
          } else if (session.participant_mode === 'teams') {
            const partRes = await run(
              db,
              'INSERT INTO Participant (game_id, type, team_id) VALUES (?, ?, ?)',
              [gid, 'team', entityId],
            );
            await run(
              db,
              'INSERT INTO Score (game_id, participant_id) VALUES (?, ?)',
              [gid, partRes.lastID],
            );
            await run(
              db,
              'INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)',
              [id, partRes.lastID],
            );
          }
        }
      }
    }

    // 2. Handle New Sub-Players for EXISTING Teams (only teams_with_players)
    if (
      newSubPlayers &&
      newSubPlayers.length > 0 &&
      session.participant_mode === 'teams_with_players'
    ) {
      for (const sp of newSubPlayers) {
        // sp has { teamId, teamName, name, assignedGameId }
        // If teamId is null but teamName is provided, this is a sub-player for a NEW team
        // Find the newly created team by name
        let actualTeamId = sp.teamId;
        if (!actualTeamId && sp.teamName) {
          const team = await get(
            db,
            'SELECT id FROM Team WHERE name = ? ORDER BY id DESC LIMIT 1',
            [sp.teamName],
          );
          if (team) actualTeamId = team.id;
        }

        if (!actualTeamId) continue; // Skip if we can't find the team

        // Create Player
        const plRes = await run(db, 'INSERT INTO Player (name) VALUES (?)', [
          sp.name,
        ]);
        const newPlayerId = plRes.lastID;

        // Link TeamPlayer
        await run(
          db,
          'INSERT INTO TeamPlayer (team_id, player_id) VALUES (?, ?)',
          [actualTeamId, newPlayerId],
        );

        // Add as participant to games
        const targetGames = getTargetGameIds(sp.assignedGameId);
        for (const gid of targetGames) {
          const partRes = await run(
            db,
            'INSERT INTO Participant (game_id, type, player_id, team_id) VALUES (?, ?, ?, ?)',
            [gid, 'player', newPlayerId, actualTeamId],
          );
          await run(
            db,
            'INSERT INTO Score (game_id, participant_id) VALUES (?, ?)',
            [gid, partRes.lastID],
          );
          await run(
            db,
            'INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)',
            [id, partRes.lastID],
          );
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET participants for a session
router.get('/:id/participants', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  try {
    const session = await get(
      db,
      'SELECT participant_mode FROM Session WHERE id = ?',
      [id],
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const mode = session.participant_mode;

    // Get ALL games for this session
    const games = await all(db, 'SELECT id FROM Game WHERE session_id = ?', [
      id,
    ]);

    if (!games || games.length === 0) return res.json([]);

    const gameIds = games.map((g) => g.id);
    const placeholders = gameIds.map(() => '?').join(',');

    if (mode === 'players') {
      const query = `
            SELECT pl.id, pl.name, MAX(p.game_id) as assignedGameId
            FROM Participant p
            JOIN Player pl ON p.player_id = pl.id
            WHERE p.game_id IN (${placeholders}) AND p.type = 'player'
            GROUP BY pl.id
         `;
      const rows = await all(db, query, gameIds);
      return res.json(rows);
    } else if (mode === 'teams') {
      const query = `
            SELECT t.id, t.name, MAX(p.game_id) as assignedGameId
            FROM Participant p
            JOIN Team t ON p.team_id = t.id
            WHERE p.game_id IN (${placeholders}) AND p.type = 'team'
            GROUP BY t.id
         `;
      const rows = await all(db, query, gameIds);
      return res.json(rows);
    } else if (mode === 'teams_with_players') {
      // Get distinct teams involved in the games
      const teamsQuery = `
            SELECT t.id, t.name, MAX(p.game_id) as assignedGameId
            FROM Participant p
            JOIN Team t ON p.team_id = t.id
            WHERE p.game_id IN (${placeholders})
            GROUP BY t.id
         `;
      const teams = await all(db, teamsQuery, gameIds);

      for (const team of teams) {
        // Get players for this team that are in these participants
        // We use the assignedGameId found for the team
        const playersQuery = `
                SELECT pl.id, pl.name
                FROM Participant p
                JOIN Player pl ON p.player_id = pl.id
                WHERE p.game_id = ? AND p.team_id = ?
             `;
        // If for some reason assignedGameId is null (shouldn't be), fallback ??
        team.players = await all(db, playersQuery, [
          team.assignedGameId,
          team.id,
        ]);
      }
      return res.json(teams);
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
