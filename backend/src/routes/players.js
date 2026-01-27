const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// GET /api/players - Haal alle spelers op
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM Player', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/players/:id - Haal specifieke speler op
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  db.get('SELECT * FROM Player WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(row);
  });
});

// POST /api/players - Maak nieuwe speler
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name } = req.body;
  
  db.run('INSERT INTO Player (name) VALUES (?)', [name], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name });
  });
});

// PUT /api/players/:id - Update speler
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { name } = req.body;
  
  db.run('UPDATE Player SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ id: parseInt(id), name });
  });
});

// DELETE /api/players/:id - Verwijder speler
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // First delete all Participant records that reference this player
  db.run('DELETE FROM Participant WHERE player_id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Then delete the player itself
    db.run('DELETE FROM Player WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.json({ message: 'Player deleted' });
    });
  });
});

module.exports = router;
