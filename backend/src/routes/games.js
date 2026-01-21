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
      COALESCE(s.value_number, s.value_time, s.value_bool) as score,
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
// Update game info (bijv. current_round, current_set, is_finished)
router.put("/:id", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { current_round, current_set, is_finished } = req.body;

    // Bouw dynamische query
    let fields = [];
    let values = [];

    if (current_round !== undefined) {
        fields.push("current_round = ?");
        values.push(current_round);
    }
    if (current_set !== undefined) {
        fields.push("current_set = ?");
        values.push(current_set);
    }
    if (is_finished !== undefined) {
        fields.push("is_finished = ?");
        values.push(is_finished);
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const query = `UPDATE Game SET ${fields.join(", ")} WHERE id = ?`;

    db.run(query, values, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

module.exports = router;
