/**
 * Socket.IO client singleton
 * Connects once; other modules use getSocket() to get the instance.
 */

import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
