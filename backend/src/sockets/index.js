const socketIo = require('socket.io');

function setupSockets(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Store the latest participants list in memory
  let currentParticipants = [];

  io.on('connection', (socket) => {
    socket.on('test-popup', (data) => {
      // Broadcast naar alle clients
      io.emit('show-popup', {
        message: data.message || 'Test popup!',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('session-init', () => {
      // Clear stored participants for the new session
      currentParticipants = [];
      // Notify all clients (displays) to clear their lists
      io.emit('display:update-participants', []);

      io.emit('display:navigate', {
        name: 'display-player-list',
      });
    });

    socket.on('session-cancel', () => {
      // Clear stored participants
      currentParticipants = [];
      // Clean up the display as well
      io.emit('display:update-participants', []);

      io.emit('display:navigate', {
        name: 'display-splash',
      });
    });

    socket.on('display:update-participants', (participants) => {
      // Update memory store
      currentParticipants = participants;
      // Broadcast to all
      io.emit('display:update-participants', participants);
    });

    socket.on('display:request-participants', () => {
      // Send only to the requester
      socket.emit('display:update-participants', currentParticipants);
    });

    socket.on('display:navigate', (data) => {
      io.emit('display:navigate', data);
    });

    socket.on('display:selected-game', (data) => {
      io.emit('display:selected-game', data);
    });

    socket.on('display:session', (data) => {
      io.emit('display:session', data);
    });

    socket.on('display:update-game-info', (data) => {
      io.emit('display:update-game-info', data);
    });

    socket.on('score:update', (data) => {
      // Broadcast score updates to all clients (including display)
      io.emit('score:update', data);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { setupSockets };
