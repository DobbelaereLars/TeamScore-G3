const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database/db");

// GET /api/games/:id
// Haal game info op
router.get("/:id", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.get("SELECT * FROM Game WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json(row);
  });
});

// GET /api/games/:id/scores
// Haal scores op voor een game (voorlopig focus op spelers en punten)
router.get("/:id/scores", (req, res) => {
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
router.put("/:id", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { 
        // Game state fields
        current_round, current_set, is_finished, 
        // Configuration fields
        name, rounds, sets, points_per_click, bonus_points,
        // ScoreModel fields (optional, if passed)
        pointsRanking, timeRanking, scoreModel, useBonusPoints, timeNotation
    } = req.body;

    // 1. Build Game Table Update Query
    let fields = [];
    let values = [];

    if (current_round !== undefined) fields.push("current_round = ?"), values.push(current_round);
    if (current_set !== undefined) fields.push("current_set = ?"), values.push(current_set);
    if (is_finished !== undefined) fields.push("is_finished = ?"), values.push(is_finished);
    
    if (name !== undefined) fields.push("name = ?"), values.push(name);
    if (rounds !== undefined) fields.push("rounds = ?"), values.push(rounds);
    if (sets !== undefined) fields.push("sets = ?"), values.push(sets);
    if (points_per_click !== undefined) fields.push("points_per_click = ?"), values.push(points_per_click);
    if (bonus_points !== undefined) fields.push("bonus_points = ?"), values.push(bonus_points);

    // If we have game fields to update
    if (fields.length > 0) {
        values.push(id);
        const query = `UPDATE Game SET ${fields.join(", ")} WHERE id = ?`;
        
        db.run(query, values, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // If no score model updates need to be done, return success here
            if (!scoreModel && !pointsRanking && !timeRanking && timeNotation === undefined) {
                return res.json({ success: true, changes: this.changes });
            }
            // Otherwise fall through to update ScoreModel
            updateScoreModel();
        });
    } else {
        // No game fields, but maybe score model fields
        if (scoreModel || pointsRanking || timeRanking || timeNotation !== undefined) {
            updateScoreModel();
        } else {
            return res.status(400).json({ error: "No fields to update" });
        }
    }

    function updateScoreModel() {
        // Fetch current score_model_id
        db.get("SELECT score_model_id FROM Game WHERE id = ?", [id], (err, row) => {
            if (err || !row) return res.status(500).json({ error: "Game not found or DB error" });
            
            const scoreModelId = row.score_model_id;
            let smFields = [];
            let smValues = [];

            // Determine ranking rule based on type
            let rankingRule = null;
             if (scoreModel === 'points' && pointsRanking) {
                rankingRule = pointsRanking === 'lowest-first' ? 'lowest_wins' : 'highest_wins';
            } else if (scoreModel === 'time' && timeRanking) {
                rankingRule = timeRanking === 'fastest-first' ? 'lowest_wins' : 'highest_wins';
            } else if (pointsRanking) {
                 // Fallback if scoreModel not explicitly passed but ranking changed
                 rankingRule = pointsRanking === 'lowest-first' ? 'lowest_wins' : 'highest_wins';
            } else if (timeRanking) {
                 rankingRule = timeRanking === 'fastest-first' ? 'lowest_wins' : 'highest_wins';
            }

            if (rankingRule) {
                smFields.push("ranking_rule = ?");
                smValues.push(rankingRule);
            }
            
            if (scoreModel) {
                 // Map frontend scoreModel to DB types
                 let dbType = scoreModel;
                 if (scoreModel === 'completed') dbType = 'boolean';
                 smFields.push("type = ?");
                 smValues.push(dbType);
            }

            if (useBonusPoints !== undefined) {
                smFields.push("has_bonus = ?");
                smValues.push(useBonusPoints ? 1 : 0);
            }
            
            // We might also need to update config_json for timeNotation etc.
            // This requires reading the old JSON first, but for simplicity let's update it if we are changing core things
            // For now, let's assume valid JSON update if needed
            
            if (smFields.length === 0) {
                 return res.json({ success: true });
            }

            smValues.push(scoreModelId);
            const smQuery = `UPDATE ScoreModel SET ${smFields.join(", ")} WHERE id = ?`;
            
            db.run(smQuery, smValues, function(err) {
                 if (err) return res.status(500).json({ error: err.message });
                 res.json({ success: true });
            });
        });
    }
});

module.exports = router;
