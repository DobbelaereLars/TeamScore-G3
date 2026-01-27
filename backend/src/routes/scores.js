const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/db');

// PUT update score for a participant in a game
// Expects: { points: 50 } OR { time: 120 } OR { bool: 1 }
// Also accepts explicit { value: 50, type: 'points' }
router.put('/:gameId/participant/:participantId/score', (req, res) => {
  const db = getDatabase();
  const { gameId, participantId } = req.params;
  const { value, type, points, time, bool, bonus } = req.body;

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
  } else if (type === 'bonus' || bonus !== undefined) {
    column = 'bonus';
    val = value !== undefined ? value : bonus;
  }

  // Allow NULL for explicit reset of score (except maybe bonus? usually bonus 0 is fine)
  // But 'value' might be explicitly null.
  // However, the check `val === undefined || val === null` prevents sending null.
  // We must allow null for time!
  if (!column || val === undefined) {
    return res
      .status(400)
      .json({
        error: 'Valid value (points, time, bool, or bonus) is required',
      });
  }
  // If val is null, we allow it (meaning reset score)

  const query = `
        UPDATE Score 
        SET ${column} = ? 
        WHERE game_id = ? AND participant_id = ?
    `;

  // For 'time' games, we also want to set value_bool = 1 to indicate "played"
  // But we don't want to break other types.
  // If column is 'value_time', we force update value_bool to 1 (played) or 0 (reset if val is null?)

  // Since we are limited to simple queries and user wants a bug fix:
  // If I use 'value_time', I run a second query to set bool?
  // Or I construct dynamic query.

  let sql = `UPDATE Score SET ${column} = ?`;
  let params = [val];

  if (column === 'value_time') {
    // Use explicit bool if provided, otherwise infer
    let boolVal;
    if (bool !== undefined) {
      boolVal = bool;
    } else {
      boolVal = val !== null && val !== undefined && val !== '' ? 1 : 0;
    }

    sql += `, value_bool = ?`;
    params.push(boolVal);
  }

  sql += ` WHERE game_id = ? AND participant_id = ?`;
  params.push(gameId, participantId);

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error updating score:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const scoreType =
      column === 'value_number'
        ? 'points'
        : column === 'value_time'
          ? 'time'
          : column === 'bonus'
            ? 'bonus'
            : 'boolean';

    const io = req.app.get('socketio');
    if (io) {
      io.emit('score:update', {
        gameId: parseInt(gameId),
        participantId: parseInt(participantId),
        score: val,
        scoreType,
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

  if (points === undefined)
    return res.status(400).json({ error: 'Points required' });

  db.run(
    `UPDATE Score SET value_number = ? WHERE game_id = ? AND participant_id = ?`,
    [points, gameId, participantId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const io = req.app.get('socketio');
      if (io) {
        io.emit('score:update', {
          gameId: parseInt(gameId),
          participantId: parseInt(participantId),
          score: points,
          scoreType: 'points',
        });
      }

      res.json({ success: true, points });
    },
  );
});

module.exports = router;
