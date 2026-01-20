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
      p.id as id,
      p.name as spelersnaam,
      s.value_number as score
    FROM Score s
    JOIN Participant part ON s.participant_id = part.id
    JOIN Player p ON part.player_id = p.id
    WHERE s.game_id = ?
    ORDER BY s.value_number DESC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;
