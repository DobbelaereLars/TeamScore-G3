const socketIo = require('socket.io');

function setupSockets(server) {
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

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

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = { setupSockets };
