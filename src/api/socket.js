import { io } from 'socket.io-client';
import { tokenStorage } from '../lib/storage.js';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
    transports: ['websocket', 'polling'],
    auth: { token: tokenStorage.getAccess() },
    autoConnect: true,
  });
  return socket;
}

export function getSocket() {
  return socket || connectSocket();
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
