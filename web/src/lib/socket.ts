import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
    });
  }

  return socket;
}
