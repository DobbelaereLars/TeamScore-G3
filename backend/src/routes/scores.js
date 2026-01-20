const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// PUT update points for a participant in a game
// Expects: { points: 50 }
router.put('/:gameId/participant/:participantId/points', (req, res) => {
    const db = getDatabase();
    const { gameId, participantId } = req.params;
    const { points } = req.body;

    if (points === undefined) {
        return res.status(400).json({ error: 'Points value is required' });
    }

    const query = `
        UPDATE Score 
        SET value_number = ? 
        WHERE game_id = ? AND participant_id = ?
    `;

    db.run(query, [points, gameId, participantId], function(err) {
        if (err) {
            console.error('Error updating score:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (this.changes === 0) {
            // Check if user exists but just didn't have a score row yet? (Should be seeded though)
            // Or maybe bad ID provided.
            // Let's force insert if it doesn't exist? Nah, seed structure ensures participation.
            return res.status(404).json({ error: 'Score entry not found (or invalid attributes)' });
        }
        res.json({ success: true, points });
    });
});

module.exports = router;
