import { io, type Socket } from "socket.io-client";
import { getApiOrigin } from "./api";

let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    let serverUrl = getApiOrigin() || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
    serverUrl = serverUrl.replace(/\/api$/, "");
    try {
      const parsed = new URL(serverUrl, window.location.href);
      if (parsed.hostname === "localhost" && window.location.hostname !== "localhost") {
        parsed.hostname = window.location.hostname;
        serverUrl = parsed.toString().replace(/\/$/, "");
      }
    } catch {}

    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
    });
  }

  return socket;
}

