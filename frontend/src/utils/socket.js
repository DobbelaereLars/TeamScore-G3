import { io } from 'socket.io-client';

// Backend URL - gebruikt automatisch het juiste protocol
// In development: http://localhost:3000
// In productie: window.location.origin bevat de volledige URL inclusief poort
//   - Op Pi: https://localhost:3000
//   - Op iPad: https://10.42.0.1:3000
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.log('Socket.io connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket.io disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Socket.io connection error:', error);
});

export default socket;
