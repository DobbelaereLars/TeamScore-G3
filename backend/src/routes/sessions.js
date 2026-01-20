const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// GET /api/sessions - Haal alle sessies op
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM Session', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/sessions/:id - Haal specifieke sessie op met alle details
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // Haal sessie op
  db.get('SELECT * FROM Session WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Haal games op voor deze sessie
    db.all('SELECT * FROM Game WHERE session_id = ?', [id], (err, games) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Haal participants op voor deze sessie
      db.all(`
        SELECT 
          p.id, p.type, p.player_id, p.team_id,
          pl.name as player_name,
          t.name as team_name
        FROM Participant p
        LEFT JOIN Player pl ON p.player_id = pl.id
        LEFT JOIN Team t ON p.team_id = t.id
        WHERE p.session_id = ?
      `, [id], (err, participants) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          ...session,
          games,
          participants
        });
      });
    });
  });
});

// GET /api/sessions/:id/participants - Haal participants voor een sessie
router.get('/:id/participants', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.all(`
    SELECT 
      p.id, p.type, p.player_id, p.team_id,
      pl.name as player_name,
      t.name as team_name
    FROM Participant p
    LEFT JOIN Player pl ON p.player_id = pl.id
    LEFT JOIN Team t ON p.team_id = t.id
    WHERE p.session_id = ?
  `, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/sessions/:id/scores - Haal alle scores voor een sessie
router.get('/:id/scores', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.all(`
    SELECT 
      s.id, s.game_id, s.participant_id, 
      s.value_number, s.value_time, s.value_bool, 
      s.bonus, s.rank,
      g.name as game_name,
      p.type as participant_type,
      pl.name as player_name,
      t.name as team_name
    FROM Score s
    JOIN Game g ON s.game_id = g.id
    JOIN Participant p ON s.participant_id = p.id
    LEFT JOIN Player pl ON p.player_id = pl.id
    LEFT JOIN Team t ON p.team_id = t.id
    WHERE g.session_id = ?
  `, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/sessions - Maak nieuwe sessie
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, participant_mode, game_mode } = req.body;
  
  db.run(
    'INSERT INTO Session (name, participant_mode, game_mode) VALUES (?, ?, ?)',
    [name, participant_mode, game_mode],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name, participant_mode, game_mode });
    }
  );
});

module.exports = router;
