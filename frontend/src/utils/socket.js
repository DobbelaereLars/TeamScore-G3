import { io } from 'socket.io-client';

// Backend URL - gebruikt automatisch het juiste protocol
// In development: http://localhost:3000
// Op de Pi met HTTPS: gebruikt het huidige protocol van de pagina
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:3000'
    : `${window.location.protocol}//${window.location.hostname}:3000`);

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
