const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database/db");

// GET all sessions
router.get("/", (req, res) => {
  const db = getDatabase();
  const query = "SELECT * FROM Session ORDER BY created_at DESC";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching sessions:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json(rows);
  });
});

// GET session by ID
router.get("/:id", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const query = "SELECT * FROM Session WHERE id = ?";

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error("Error fetching session:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!row) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(row);
  });
});

// GET games for a session with details (players, scores)
router.get("/:id/games", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  // First get games
  db.all("SELECT * FROM Game WHERE session_id = ?", [id], (err, games) => {
    if (err) {
      console.error("Error fetching games for session:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (games.length === 0) {
      return res.json([]);
    }

    // Get scores for all these games
    const gameIds = games.map((g) => g.id);
    const placeholders = gameIds.map(() => "?").join(",");

    const scoreQuery = `
            SELECT
                s.game_id,
                s.value_number,
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

    db.all(scoreQuery, gameIds, (err, scores) => {
      if (err) {
        console.error("Error fetching scores:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      // Combine
      const gamesWithDetails = games.map((game) => {
        const gameScores = scores.filter((s) => s.game_id === game.id);
        // Map scores to player objects
        const players = gameScores.map((s) => ({
          // Prefer player_id/team_id, fallback to participant_id
          id: s.player_id || s.team_id || s.participant_id,
          name: s.player_name || s.team_name || "Unknown",
          points: s.value_number || 0,
        }));

        return {
          ...game,
          perClick: 1, // Default
          currentRound: 1, // Default
          players: players,
        };
      });

      res.json(gamesWithDetails);
    });
  });
});

// POST create new session
router.post("/", (req, res) => {
  const db = getDatabase();
  const { name, participant_mode, game_mode } = req.body;

  if (!name || !participant_mode || !game_mode) {
    return res
      .status(400)
      .json({
        error: "Missing required fields: name, participant_mode, game_mode",
      });
  }

  const validParticipants = ["players", "teams", "teams_with_players"];
  const validModes = ["single", "series", "parallel"];

  if (!validParticipants.includes(participant_mode)) {
    return res
      .status(400)
      .json({
        error: `Invalid participant_mode. Must be one of: ${validParticipants.join(", ")}`,
      });
  }

  if (!validModes.includes(game_mode)) {
    return res
      .status(400)
      .json({
        error: `Invalid game_mode. Must be one of: ${validModes.join(", ")}`,
      });
  }

  const query = `
        INSERT INTO Session (name, participant_mode, game_mode)
        VALUES (?, ?, ?)
    `;

  db.run(query, [name, participant_mode, game_mode], function (err) {
    if (err) {
      console.error("Error creating session:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    // Return created object
    res.status(201).json({
      id: this.lastID,
      name,
      participant_mode,
      game_mode,
      // We don't have created_at immediately without a refetch, but frontend might not need it exact right now
      // or we could SELECT again. For simplicity, just return what we have.
    });
  });
});

// DELETE session
router.delete("/:id", (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const query = "DELETE FROM Session WHERE id = ?";

  db.run(query, [id], function (err) {
    if (err) {
      console.error("Error deleting session:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ message: "Session deleted successfully" });
  });
});

module.exports = router;
