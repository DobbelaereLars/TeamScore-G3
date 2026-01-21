const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// PUT update score for a participant in a game
// Expects: { points: 50 } OR { time: 120 } OR { bool: 1 }
// Also accepts explicit { value: 50, type: 'points' }
router.put('/:gameId/participant/:participantId/score', (req, res) => {
    const db = getDatabase();
    const { gameId, participantId } = req.params;
    const { value, type, points, time, bool } = req.body;

    let column = '';
    let val = null;

    if (type === 'points' || points !== undefined) {
        column = 'value_number';
        val = value !== undefined ? value : points;
    } else if (type === 'time' || time !== undefined) {
        column = 'value_time';
        val = value !== undefined ? value : time;
    } else if (type === 'boolean' || type === 'bool' || bool !== undefined) {
        column = 'value_bool';
        val = value !== undefined ? value : bool;
    }

    if (!column || val === undefined || val === null) {
        return res.status(400).json({ error: 'Valid value (points, time, or bool) is required' });
    }

    const query = `
        UPDATE Score 
        SET ${column} = ? 
        WHERE game_id = ? AND participant_id = ?
    `;

    db.run(query, [val, gameId, participantId], function(err) {
        if (err) {
            console.error('Error updating score:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const scoreType = column === 'value_number' ? 'points' : 
                          column === 'value_time' ? 'time' : 'boolean';

        const io = req.app.get('socketio');
        if (io) {
             io.emit('score:update', { 
                gameId: parseInt(gameId), 
                participantId: parseInt(participantId), 
                score: val, 
                scoreType 
            });
        }

        res.json({ success: true, updatedField: column, value: val });
    });
});

// Backward compatibility (optional)
router.put('/:gameId/participant/:participantId/points', (req, res) => {
    // Redirect to the new logic internally or duplicate
    const db = getDatabase();
    const { gameId, participantId } = req.params;
    const { points } = req.body;
    
    if (points === undefined) return res.status(400).json({ error: 'Points required' });

    db.run(`UPDATE Score SET value_number = ? WHERE game_id = ? AND participant_id = ?`, 
        [points, gameId, participantId], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            const io = req.app.get('socketio');
            if (io) {
                io.emit('score:update', { 
                    gameId: parseInt(gameId), 
                    participantId: parseInt(participantId), 
                    score: points, 
                    scoreType: 'points' 
                });
            }

            res.json({ success: true, points });
        }
    );
});

module.exports = router;
