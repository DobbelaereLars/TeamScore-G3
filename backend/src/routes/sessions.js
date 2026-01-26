const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
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
        time: s.value_time, // Keep null if not set
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

// GET final scores for a session (Leaderboard) with robust Z-score normalization
router.get('/:id/final-scores', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { gameId } = req.query;

  try {
    // 1. Fetch Session to check mode (optional, but good for context)
    const session = await get(db, 'SELECT * FROM Session WHERE id = ?', [id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // 2. Fetch All Games for Session
    let gamesQuery = `
      SELECT g.*, sm.type as score_type, sm.ranking_rule
      FROM Game g
      JOIN ScoreModel sm ON g.score_model_id = sm.id
      WHERE g.session_id = ?
    `;
    const queryParams = [id];

    if (gameId) {
      gamesQuery += ' AND g.id = ?';
      queryParams.push(gameId);
    }

    const games = await all(db, gamesQuery, queryParams);

    if (games.length === 0) return res.json([]);

    const gameIds = games.map((g) => g.id);

    // 3. Fetch Scores
    const scores = await all(
      db,
      `
            SELECT
                s.game_id,
                s.participant_id,
                s.value_number,
                s.value_time,
                s.value_bool,
                s.bonus,
                p.type as participant_type,
                COALESCE(pl.name, tm.name) as participant_name,
                COALESCE(pl.id, tm.id) as entity_id
            FROM Score s
            JOIN Participant p ON s.participant_id = p.id
            LEFT JOIN Player pl ON p.player_id = pl.id
            LEFT JOIN Team tm ON p.team_id = tm.id
            WHERE s.game_id IN (${gameIds.map(() => '?').join(',')})
        `,
      gameIds,
    );

    // *** SPECIAL HANDLING FOR SINGLE GAME MODE (OR SINGLE GAME IN SERIES) ***
    // Checks if the session is explicitly 'single' OR if there is only 1 game total.
    // In both cases, showing raw scores (Time, Boolean, Points) is preferred over normalization.
    if (
      (session.game_mode === 'single' || games.length === 1) &&
      games.length > 0
    ) {
      const game = games[0];
      const scoreType = game.score_type;
      const rankingRule = game.ranking_rule;

      const singleGameScores = scores
        .filter((s) => s.game_id === game.id)
        .map((s) => {
          let rawScore = null;
          // For Single Game used in Leaderboard, we want to show the ACTUAL score.
          // Not normalized.
          if (scoreType === 'points') {
            rawScore = (s.value_number || 0) + (s.bonus || 0);
          } else if (scoreType === 'time') {
            // Time: keep null if no score, 0 is valid (fastest time)
            // Ensure empty string is treated as null
            rawScore =
              s.value_time !== null &&
              s.value_time !== undefined &&
              s.value_time !== ''
                ? s.value_time
                : null;
          } else if (scoreType === 'boolean') {
            rawScore = s.value_bool ? 1 : 0;
          }

          return {
            participant_id: s.participant_id,
            participant_type: s.participant_type,
            participant_name: s.participant_name,
            player_name:
              s.participant_type === 'player' ? s.participant_name : null,
            team_name:
              s.participant_type === 'team' ? s.participant_name : null,
            total_points: rawScore, // Raw value
            score_type: scoreType,
            is_single_game: true,
            // Pass ranking rule to help frontend if needed, though we sort here
            ranking_rule: rankingRule,
          };
        });

      // *** Multi-Round Logic for Single Game (Boolean Majority) ***
      if (scoreType === 'boolean' || scoreType === 'bool') {
        // Get the total number of rounds configured for this game
        const totalRounds = game.rounds || 1;

        // We need to fetch history if available
        const roundScores = await all(
          db,
          `
                SELECT participant_id, value_bool 
                FROM RoundScore 
                WHERE game_id = ?
             `,
          [game.id],
        );

        // Merge with current `scores` (which represents the latest round)
        // We want: For each participant, Count(Completed) across ALL rounds (history + current).

        // 1. Map history
        const stats = {};
        // Init with participants
        singleGameScores.forEach((p) => {
          stats[p.participant_id] = { completed: 0 };
        });

        // Add history
        roundScores.forEach((rs) => {
          if (stats[rs.participant_id]) {
            if (rs.value_bool) stats[rs.participant_id].completed++;
          }
        });

        // Add current round (from `scores`)
        scores
          .filter((s) => s.game_id === game.id)
          .forEach((s) => {
            if (stats[s.participant_id]) {
              if (s.value_bool) stats[s.participant_id].completed++;
            }
          });

        // Calculate Majority based on TOTAL ROUNDS (not played rounds)
        // A player is "Voltooid" only if they completed at least half of ALL rounds
        singleGameScores.forEach((p) => {
          const s = stats[p.participant_id];
          if (!s) {
            p.total_points = 0; // Default
            return;
          }

          // Majority Rule based on total rounds:
          // "de helft of meer voltooid ten opzichte van de rondes"
          // If totalRounds = 4, need >= 2 completed
          // If totalRounds = 3, need >= 1.5 -> 2 completed
          // If totalRounds = 1, need >= 0.5 -> 1 completed

          const required = totalRounds / 2;

          if (s.completed >= required) {
            p.total_points = 1; // Completed
          } else {
            p.total_points = 0; // Not Completed
          }
        });
      }

      // Sort based on rules
      singleGameScores.sort((a, b) => {
        if (scoreType === 'boolean') return b.total_points - a.total_points; // 1 > 0
        
        // Determine if lower is better
        let isLowestWins = false;
        if (scoreType === 'time') {
          // Time: default to lowest_wins (fastest) UNLESS explicitly set to highest_wins
          isLowestWins = rankingRule !== 'highest_wins';
        } else {
          // Points: default to highest_wins UNLESS explicitly set to lowest_wins
          isLowestWins = rankingRule === 'lowest_wins';
        }

        if (isLowestWins) {
          // For time: lowest wins. null means "no score" and should be ranked last
          // 0 is a valid time (fastest possible)
          const scoreA = a.total_points === null ? Infinity : a.total_points;
          const scoreB = b.total_points === null ? Infinity : b.total_points;
          return scoreA - scoreB; // Lower is better
        }
        return b.total_points - a.total_points; // Higher is better
      });

      // Assign Rank
      singleGameScores.forEach((r, idx) => (r.final_rank = idx + 1));

      res.json(singleGameScores);
      return;
    }

    // Helper: Calculate Mean and StdDev
    const calculateStats = (values) => {
      const n = values.length;
      if (n === 0) return { mean: 0, stdDev: 0 };
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const variance =
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
        (n > 1 ? n - 1 : 1); // Sample StdDev
      // Or Population StdDev? Sample usually better for small groups.
      // If n=1, variance is 0 (handled by division rules later or logic)
      return { mean, stdDev: Math.sqrt(variance) };
    };

    // 4. Process Scores Per Game
    const participantFinalScores = {}; // Map: entity_id -> { totalZ, count, name, type }

    // Initialize map with all participants found in scores
    scores.forEach((s) => {
      // Use entity_id to aggregate across games
      const key = s.entity_id;
      if (!participantFinalScores[key]) {
        participantFinalScores[key] = {
          id: s.participant_id, // Keep one participant ID reference
          entity_id: s.entity_id,
          name: s.participant_name,
          type: s.participant_type,
          sumZ: 0,
          gamesPlayed: 0,
        };
      }
    });

    for (const game of games) {
      // Filter scores for this game
      const gameScores = scores.filter((s) => s.game_id === game.id);
      if (gameScores.length === 0) continue;

      const scoreType = game.score_type;
      const rankingRule = game.ranking_rule; // 'highest_wins' or 'lowest_wins'

      if (scoreType === 'points') {
        // Points: Raw = value + bonus
        const rawValues = gameScores.map(
          (s) => (s.value_number || 0) + (s.bonus || 0),
        );
        const { mean, stdDev } = calculateStats(rawValues);

        gameScores.forEach((s, idx) => {
          const raw = rawValues[idx];
          let z = 0;
          if (stdDev !== 0) {
            z = (raw - mean) / stdDev;
          }
          // Direction: Highest wins (Points).
          // If rankingRule is lowest_wins (e.g. golf), invert.
          if (rankingRule === 'lowest_wins') z = -z;

          // Aggregate by entity_id
          if (participantFinalScores[s.entity_id]) {
            participantFinalScores[s.entity_id].sumZ += z;
            participantFinalScores[s.entity_id].gamesPlayed += 1;
          }
        });
      } else if (scoreType === 'time') {
        // Time: Raw = value_time - bonus (Assuming bonus improves time)
        // Or typically bonus is separate. Let's assume raw = time - bonus is good logic for "Bonus".
        const rawValues = gameScores.map(
          (s) => (s.value_time || 0) - (s.bonus || 0),
        );
        const { mean, stdDev } = calculateStats(rawValues);

        gameScores.forEach((s, idx) => {
          const raw = rawValues[idx];
          let z = 0;
          if (stdDev !== 0) {
            z = (raw - mean) / stdDev;
          }
          // Direction: Lowest wins (Time).
          // Standard Z: (x - mean)/std. If x > mean (slower), Z > 0. Bad.
          // We want Better Time (Lower) -> Higher Score.
          // So Invert Z.
          if (rankingRule === 'lowest_wins') z = -z;
          // If it was highest_wins (longest time?), keep Z.

          if (participantFinalScores[s.entity_id]) {
            participantFinalScores[s.entity_id].sumZ += z;
            participantFinalScores[s.entity_id].gamesPlayed += 1;
          }
        });
      } else if (scoreType === 'boolean') {
        // Boolean: 1 or 0. No Z-Score normalization requested.
        gameScores.forEach((s) => {
          const val = s.value_bool ? 1 : 0;
          // Bonus for boolean? Maybe?
          // "Bonus: Tel op bij ruwe score" -> 1 + bonus?
          const finalVal = val + (s.bonus || 0);

          if (participantFinalScores[s.entity_id]) {
            participantFinalScores[s.entity_id].sumZ += finalVal;
            participantFinalScores[s.entity_id].gamesPlayed += 1;
          }
        });
      }
    }

    // 5. Finalize Scores
    const result = Object.values(participantFinalScores).map((p) => {
      // Average Z-Score (or Sum?)
      // "Som genormaliseerde waarden over games, deel door aantal games voor gemiddelde."
      // We use total games in session or games played?
      // "deel door aantal games". Usually implies games played or total games.
      // Let's use games.length (Total Games in Session) to penalize missing games?
      // Or p.gamesPlayed?
      // If I miss a game, do I get 0? 0 Z-score is "Average".
      // It's safer to divide by Total Games in Session if we want fairness across all.
      // But if `parallel`, maybe different people play different games?
      // Let's divide by `games.length` for Series/Single.
      // For Parallel, implies all run at same time?
      // Let's stick to "gamesPlayed" to be safe for now, or games.length if generic.
      // User said: "deel door aantal games voor gemiddelde".
      // Let's use `games.length` to normalize against the full set.

      const count = games.length || 1;
      const avgZ = p.sumZ / count;

      // Multiply to remove decimals
      // Using 100 as multiplier
      const finalScore = Math.round(avgZ * 100);

      return {
        participant_id: p.id,
        participant_type: p.type,
        participant_name: p.name || 'Unknown', // Use captured name
        player_name: p.type === 'player' ? p.name : null,
        team_name: p.type === 'team' ? p.name : null,
        total_points: finalScore,
        final_rank: 0, // Will sort later
      };
    });

    // Sort descending
    result.sort((a, b) => b.total_points - a.total_points);

    // Assign rank
    result.forEach((r, idx) => (r.final_rank = idx + 1));

    res.json(result);
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

    // Delete session image if exists
    const imagePath = path.join(
      __dirname,
      '..',
      '..',
      'data',
      'session_images',
      `session_${id}.webp`,
    );
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (e) {
        console.error('Failed to delete session image:', e);
      }
    }

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

// PUT /api/sessions/:id/participants/assignment
// Update game assignments for existing participants (Resets scores!)
router.put('/:id/participants/assignment', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { moves } = req.body; // Array of { id (entityId), type ('player'|'team'), newGameId }

  if (!moves || moves.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  try {
    await run(db, 'BEGIN TRANSACTION');

    const session = await get(
      db,
      'SELECT participant_mode FROM Session WHERE id = ?',
      [id],
    );
    if (!session) throw new Error('Session not found');

    for (const move of moves) {
      // 1. Find and Delete existing participant records for this entity in this SESSION
      // We look for participants linked to games in this session
      let deleteQuery = '';
      let deleteParams = [];

      if (move.type === 'player') {
        const fetchQuery = `
          SELECT p.id 
          FROM Participant p
          JOIN Game g ON p.game_id = g.id
          WHERE g.session_id = ? AND p.player_id = ? AND p.type = 'player'
        `;
        const parts = await all(db, fetchQuery, [id, move.id]);

        for (const p of parts) {
          await run(db, 'DELETE FROM Participant WHERE id = ?', [p.id]);
        }
      } else if (move.type === 'team') {
        const fetchQuery = `
          SELECT p.id 
          FROM Participant p
          JOIN Game g ON p.game_id = g.id
          WHERE g.session_id = ? AND p.team_id = ? AND p.type = 'team'
        `;
        const parts = await all(db, fetchQuery, [id, move.id]);

        for (const p of parts) {
          await run(db, 'DELETE FROM Participant WHERE id = ?', [p.id]);
        }
      } else if (move.type === 'team_with_players') {
        // Should act like team but needs to handle subplayers?
        // Assuming frontend sends the TEAM ID as 'team' or similar.
        // Logic handles "teams" mode and "teams_with_players" mode similarly regarding the Team entity itself if it's the anchor.
        // But wait, in teams_with_players, the PARTICIPANTS are the sub-players.
        // So if we move a TEAM, we must move all sub-players.

        // Let's assume the frontend sends individual sub-player moves?
        // OR frontend sends the Team move, and we handle the cascade.
        // Let's rely on 'type'.
        // If `participant_mode` is `teams_with_players`, we expect `move.id` to be a TEAM ID if the UI manages teams.
        // BUT the Participant records are for sub-players.

        if (
          session.participant_mode === 'teams_with_players' &&
          move.type === 'team'
        ) {
          // Find all participants that belong to this team in this session
          const fetchQuery = `
              SELECT p.id 
              FROM Participant p
              JOIN Game g ON p.game_id = g.id
              WHERE g.session_id = ? AND p.team_id = ? AND p.type = 'player'
            `;
          const parts = await all(db, fetchQuery, [id, move.id]);
          for (const p of parts) {
            await run(db, 'DELETE FROM Participant WHERE id = ?', [p.id]);
          }
        }
      }

      // 2. Create NEW Participant record(s) in the new Game
      // This implicitly resets the score because the old Score was deleted via Cascade (or we made new ones)

      if (session.participant_mode === 'players') {
        const partRes = await run(
          db,
          'INSERT INTO Participant (game_id, type, player_id) VALUES (?, ?, ?)',
          [move.newGameId, 'player', move.id],
        );
        await run(
          db,
          'INSERT INTO Score (game_id, participant_id) VALUES (?, ?)',
          [move.newGameId, partRes.lastID],
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
          [move.newGameId, 'team', move.id],
        );
        await run(
          db,
          'INSERT INTO Score (game_id, participant_id) VALUES (?, ?)',
          [move.newGameId, partRes.lastID],
        );
        await run(
          db,
          'INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)',
          [id, partRes.lastID],
        );
      } else if (session.participant_mode === 'teams_with_players') {
        if (move.type === 'team') {
          // Moving a whole team
          // We need to find the sub-players of this team to re-add them
          // We can find them via TeamPlayer table
          const subPlayers = await all(
            db,
            'SELECT player_id FROM TeamPlayer WHERE team_id = ?',
            [move.id],
          );

          for (const sub of subPlayers) {
            const partRes = await run(
              db,
              'INSERT INTO Participant (game_id, type, player_id, team_id) VALUES (?, ?, ?, ?)',
              [move.newGameId, 'player', sub.player_id, move.id],
            );
            await run(
              db,
              'INSERT INTO Score (game_id, participant_id) VALUES (?, ?)',
              [move.newGameId, partRes.lastID],
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

    await run(db, 'COMMIT');
    res.json({ success: true });
  } catch (error) {
    await run(db, 'ROLLBACK');
    console.error('Error updating assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPLOAD session image
router.post('/:id/image', express.json({ limit: '10mb' }), (req, res) => {
  const { id } = req.params;
  const { image } = req.body; // Expects base64 string "data:image/webp;base64,..."

  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  // Remove header
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const dataDir = path.join(__dirname, '..', '..', 'data', 'session_images');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filePath = path.join(dataDir, `session_${id}.webp`);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error('Error saving session image:', err);
      return res.status(500).json({ error: 'Failed to save image' });
    }
    res.json({ success: true, url: `/session-images/session_${id}.webp` });
  });
});

module.exports = router;
