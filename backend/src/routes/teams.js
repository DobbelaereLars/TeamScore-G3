const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// GET /api/teams - Get all teams
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM Team', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET /api/teams/:id - Get team by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  db.get('SELECT * FROM Team WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(row);
  });
});

// POST /api/teams - Create team
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Team name is required' });
  }
  
  db.run('INSERT INTO Team (name) VALUES (?)', [name], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name });
  });
});

// PUT /api/teams/:id - Update team
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { name } = req.body;
  
  db.run('UPDATE Team SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ id: parseInt(id), name });
  });
});

// DELETE /api/teams/:id - Delete team
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  // First delete all Participant records that reference this team
  db.run('DELETE FROM Participant WHERE team_id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Then delete the team itself
    db.run('DELETE FROM Team WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }
      res.json({ message: 'Team deleted' });
    });
  });
});

module.exports = router;
