import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

let socket = null;

// The socket is created lazily and reused across the app (one connection
// per browser tab). Auth is via the http-only cookie, sent automatically
// because `withCredentials` mirrors what the server's CORS config expects.
export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
