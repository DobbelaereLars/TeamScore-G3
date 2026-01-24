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

const all = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
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

// GET /api/games/:id
// Haal game info op
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.get(
    `
    SELECT g.*, sm.type as score_type, sm.config_json as score_config, sm.ranking_rule
    FROM Game g
    LEFT JOIN ScoreModel sm ON g.score_model_id = sm.id
    WHERE g.id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Game not found' });
      }
      res.json(row);
    },
  );
});

// POST /api/games
// Create a new game
router.post('/', async (req, res) => {
  const db = getDatabase();
  const {
    sessionId,
    name,
    // Game config
    rounds,
    sets,
    points_per_click,
    bonus_points,
    is_finished,
    // ScoreModel config
    scoreModel,
    pointsRanking,
    timeRanking,
    timeNotation,
    useBonusPoints,
    // Participants (optional, default to all in session if possible or passed explicitly)
    // Expecting an array of { id: number, type: 'player'|'team' }
    // OR just rely on fetching session participants if not provided?
    // Let's rely on the frontend passing the session ID, and we can duplicate participants
    // from another game in the session OR fetch based on mode.
    // EASIER: Frontend passes "participantEntities" which contains IDs of players or teams to add.
    participantEntities, // Array of IDs (player_id or team_id depending on session mode)
  } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

  try {
    await run(db, 'BEGIN TRANSACTION');

    // 1. Get Session Info to determine modes
    const session = await get(db, 'SELECT * FROM Session WHERE id = ?', [
      sessionId,
    ]);
    if (!session) throw new Error('Session not found');

    const participantMode = session.participant_mode;

    // 2. Create ScoreModel
    let dbScoreType = 'points';
    if (scoreModel === 'time') dbScoreType = 'time';
    if (scoreModel === 'completed') dbScoreType = 'boolean';

    let rankingRule = 'highest_wins';
    if (dbScoreType === 'points') {
      rankingRule =
        pointsRanking === 'lowest-first' ? 'lowest_wins' : 'highest_wins';
    } else if (dbScoreType === 'time') {
      rankingRule =
        timeRanking === 'fastest-first' ? 'lowest_wins' : 'highest_wins';
    }

    const configJson = JSON.stringify({
      pointsPerAction: points_per_click || 1,
      bonusPoints: useBonusPoints ? bonus_points || 1 : 0,
      timeNotation: timeNotation || 'mm:ss',
    });

    const smRes = await run(
      db,
      `INSERT INTO ScoreModel (type, has_bonus, ranking_rule, config_json) VALUES (?, ?, ?, ?)`,
      [dbScoreType, useBonusPoints ? 1 : 0, rankingRule, configJson],
    );
    const scoreModelId = smRes.lastID;

    // 3. Create Game
    const gameRes = await run(
      db,
      `INSERT INTO Game (
                session_id, name, rounds, sets, current_round, current_set, 
                score_model_id, is_finished, points_per_click, bonus_points
            ) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?)`,
      [
        sessionId,
        name || 'Nieuw Spel',
        rounds || 1,
        sets || 1,
        scoreModelId,
        is_finished || 0,
        points_per_click || 1,
        bonus_points || 0,
      ],
    );
    const newGameId = gameRes.lastID;

    // 4. Create Participants
    // If participantEntities provided, use them.
    // Otherwise, try to find existing players/teams linked to this session?
    // Actually, the easiest way to get "all session participants" is to find
    // the "distinct players/teams that participated in ANY game of this session".

    // Let's use participantEntities passed from frontend for explicit control.
    let entitiesToAdd = participantEntities;

    // Check if session game mode is parallel. If so, DO NOT auto-add participants from other games.
    const gameMode = session.game_mode;

    if (gameMode === 'parallel') {
      // Only use passed entities. If none passed (or empty array), add NO ONE.
      // Unless explicit flag says otherwise?
      // In Game Settings V2, we handle assignments separately.
      // So `participantEntities` coming from frontend create call should only contain assignments FOR THIS GAME.
      // But the frontend `performSave` sends ALL participants in `participantEntities`.
      // This is the bug.

      // Quick Fix: If parallel mode, Ignore `participantEntities` unless specifically structured for this game?
      // Or better: Frontend sends assignments separately.
      // Backend `POST /games` should rely on explicit instruction.

      // If frontend sends ALL, and backend uses ALL, then everyone is in the new game.
      // Change logic: In parallel mode, default to EMPTY unless explicitly instructed?

      // But for "Series" mode, "All" is correct behavior.

      // For now, if parallel, we force "entitiesToAdd" to be empty unless we want to support direct assignment here.
      // The frontend does `updateAssignments` separately for parallel distribution.
      entitiesToAdd = [];
    } else {
      // Series or Single: Everyone in session should be in the new game (probably)
      if (!entitiesToAdd || entitiesToAdd.length === 0) {
        // Fallback: Fetch unique players/teams from other games in this session
        const query = `
                    SELECT DISTINCT 
                        CASE WHEN p.type = 'player' THEN p.player_id ELSE p.team_id END as id,
                        p.type
                    FROM Participant p
                    JOIN Game g ON p.game_id = g.id
                    WHERE g.session_id = ?
                 `;
        const existing = await all(db, query, [sessionId]);
        entitiesToAdd = existing.map((e) => e.id);
      }
    }

    for (const entityId of entitiesToAdd) {
      // Determine what participants to create based on mode
      let participantsToCreate = [];

      if (participantMode === 'players') {
        participantsToCreate.push({
          type: 'player',
          playerId: entityId,
          teamId: null,
        });
      } else if (participantMode === 'teams') {
        participantsToCreate.push({
          type: 'team',
          playerId: null,
          teamId: entityId,
        });
      } else if (participantMode === 'teams_with_players') {
        const subPlayers = await all(
          db,
          'SELECT player_id FROM TeamPlayer WHERE team_id = ?',
          [entityId],
        );
        for (const sp of subPlayers) {
          participantsToCreate.push({
            type: 'player',
            playerId: sp.player_id,
            teamId: entityId,
          });
        }
      }

      for (const pCtx of participantsToCreate) {
        const pRes = await run(
          db,
          `INSERT INTO Participant (game_id, type, player_id, team_id) VALUES (?, ?, ?, ?)`,
          [newGameId, pCtx.type, pCtx.playerId, pCtx.teamId],
        );
        const participantId = pRes.lastID;

        // Create Score
        await run(
          db,
          `INSERT INTO Score (game_id, participant_id, value_number, value_time, value_bool) VALUES (?, ?, 0, 0, 0)`,
          [newGameId, participantId],
        );

        // Initialize FinalScore
        await run(
          db,
          `INSERT OR IGNORE INTO FinalScore (session_id, participant_id, total_points, final_rank) VALUES (?, ?, 0, 0)`,
          [sessionId, participantId],
        );
      }
    }

    await run(db, 'COMMIT');
    res.json({ success: true, id: newGameId });
  } catch (e) {
    await run(db, 'ROLLBACK');
    console.error('Error creating game:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/games/:id/scores
// Haal scores op voor een game (voorlopig focus op spelers en punten)
router.get('/:id/scores', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  // Query om scores van spelers op te halen
  // We joinen Score -> Participant -> Player
  // We nemen value_number als standaards core
  const query = `
    SELECT 
      part.id as id,
      COALESCE(pl.name, tm.name) as spelersnaam,
      COALESCE(s.value_number, s.value_time, s.value_bool, 0) as score,
      s.rank
    FROM Score s
    JOIN Participant part ON s.participant_id = part.id
    LEFT JOIN Player pl ON part.player_id = pl.id
    LEFT JOIN Team tm ON part.team_id = tm.id
    WHERE s.game_id = ?
    ORDER BY s.rank ASC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// PUT /api/games/:id
// Update game info (rounds, sets, config, etc.)
router.put('/:id', async (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    // Game state fields
    current_round,
    current_set,
    is_finished,
    // Configuration fields
    name,
    rounds,
    sets,
    points_per_click,
    bonus_points,
    // ScoreModel fields (optional, if passed)
    pointsRanking,
    timeRanking,
    scoreModel,
    useBonusPoints,
    timeNotation,
  } = req.body;

  // 1. Check if we need to snapshot round logic (BEFORE update)
  if (current_round !== undefined && current_round > 1) { // Implicitly, if we are setting to 2, previous was 1
      // Fetch current state to confirm previous Round
      const gameRow = await get(db, 'SELECT current_round, current_set, score_model_id FROM Game WHERE id = ?', [id]);
      if (gameRow && gameRow.current_round < current_round) {
          // A Round Advance is happening!
          
          // 1. Snapshot scores to RoundScore
          await run(db, `
              INSERT INTO RoundScore (game_id, participant_id, round, set_number, value_number, value_time, value_bool, bonus)
              SELECT game_id, participant_id, ?, ?, value_number, value_time, value_bool, bonus
              FROM Score
              WHERE game_id = ?
          `, [gameRow.current_round, gameRow.current_set || 1, id]);
          
          // 2. Reset Boolean Scores (as requested: "iedereen niet voltooid")
          // Check if ScoreModel is boolean
          const smRow = await get(db, 'SELECT type FROM ScoreModel WHERE id = ?', [gameRow.score_model_id]);
          if (smRow && (smRow.type === 'boolean' || smRow.type === 'bool')) {
             await run(db, `UPDATE Score SET value_bool = 0 WHERE game_id = ?`, [id]);
             
             // Emit reset event? Or the current_round update will force refresh and show new empty state
          }
      }
  }

  // 1b. Build Game Table Update Query
  let fields = [];
  let values = [];

  if (current_round !== undefined)
    (fields.push('current_round = ?'), values.push(current_round));
  if (current_set !== undefined)
    (fields.push('current_set = ?'), values.push(current_set));
  if (is_finished !== undefined)
    (fields.push('is_finished = ?'), values.push(is_finished));

  if (name !== undefined) (fields.push('name = ?'), values.push(name));
  if (rounds !== undefined) (fields.push('rounds = ?'), values.push(rounds));
  if (sets !== undefined) (fields.push('sets = ?'), values.push(sets));
  if (points_per_click !== undefined)
    (fields.push('points_per_click = ?'), values.push(points_per_click));
  if (bonus_points !== undefined)
    (fields.push('bonus_points = ?'), values.push(bonus_points));

  // If we have game fields to update
  if (fields.length > 0) {
    values.push(id);
    const query = `UPDATE Game SET ${fields.join(', ')} WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // If no score model updates need to be done, return success here
      if (
        !scoreModel &&
        !pointsRanking &&
        !timeRanking &&
        timeNotation === undefined
      ) {
        return res.json({ success: true, changes: this.changes });
      }
      // Otherwise fall through to update ScoreModel
      updateScoreModel();
    });
  } else {
    // No game fields, but maybe score model fields
    if (
      scoreModel ||
      pointsRanking ||
      timeRanking ||
      timeNotation !== undefined
    ) {
      updateScoreModel();
    } else {
      return res.status(400).json({ error: 'No fields to update' });
    }
  }

  function updateScoreModel() {
    // Fetch current score_model_id
    db.get('SELECT score_model_id FROM Game WHERE id = ?', [id], (err, row) => {
      if (err || !row)
        return res.status(500).json({ error: 'Game not found or DB error' });

      const scoreModelId = row.score_model_id;
      let smFields = [];
      let smValues = [];

      // Determine ranking rule based on type
      let rankingRule = null;
      if (scoreModel === 'points' && pointsRanking) {
        rankingRule =
          pointsRanking === 'lowest-first' ? 'lowest_wins' : 'highest_wins';
      } else if (scoreModel === 'time' && timeRanking) {
        rankingRule =
          timeRanking === 'fastest-first' ? 'lowest_wins' : 'highest_wins';
      } else if (pointsRanking) {
        // Fallback if scoreModel not explicitly passed but ranking changed
        rankingRule =
          pointsRanking === 'lowest-first' ? 'lowest_wins' : 'highest_wins';
      } else if (timeRanking) {
        rankingRule =
          timeRanking === 'fastest-first' ? 'lowest_wins' : 'highest_wins';
      }

      if (rankingRule) {
        smFields.push('ranking_rule = ?');
        smValues.push(rankingRule);
      }

      if (scoreModel) {
        // Map frontend scoreModel to DB types
        let dbType = scoreModel;
        if (scoreModel === 'completed') dbType = 'boolean';
        smFields.push('type = ?');
        smValues.push(dbType);
      }

      if (useBonusPoints !== undefined) {
        smFields.push('has_bonus = ?');
        smValues.push(useBonusPoints ? 1 : 0);
      }

      // We might also need to update config_json for timeNotation etc.
      // This requires reading the old JSON first, but for simplicity let's update it if we are changing core things
      // For now, let's assume valid JSON update if needed

      if (smFields.length === 0) {
        return res.json({ success: true });
      }

      smValues.push(scoreModelId);
      const smQuery = `UPDATE ScoreModel SET ${smFields.join(', ')} WHERE id = ?`;

      db.run(smQuery, smValues, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  }
});

// DELETE /api/games/:id
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run('DELETE FROM Game WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
