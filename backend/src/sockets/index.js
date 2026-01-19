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
    console.log('Client connected:', socket.id);

    socket.on('test-popup', (data) => {
      console.log('Test popup event received:', data);
      // Broadcast naar alle clients
      io.emit('show-popup', {
        message: data.message || 'Test popup!',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('session-init', () => {
      console.log('Session init event received');
      io.emit('display:navigate', {
        name: 'display-player-list',
      });
    });

    socket.on('session-cancel', () => {
      console.log('Session cancel event received');

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
      console.log('Sending current participants to requester:', socket.id);
      socket.emit('display:update-participants', currentParticipants);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = { setupSockets };
