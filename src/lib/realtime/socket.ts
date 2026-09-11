import { io, type Socket } from "socket.io-client";
import { getToken } from "@/lib/auth/session";

// The REST base URL includes the /api/v1 prefix; Socket.IO connects at the
// server root and addresses the /messaging namespace itself, so that prefix
// is stripped rather than requiring a second env var for the same origin.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
const WS_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

let socket: Socket | null = null;

/**
 * One socket connection per browser session, established once (by
 * MessagingSocketProvider, mounted at the root provider level) and reused
 * everywhere — not one per component/page. `auth` is a function (not a
 * captured token value) so a rotated token is picked up fresh on the next
 * reconnect rather than stale-captured at first connect.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(`${WS_ORIGIN}/messaging`, {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    // Try a direct WebSocket handshake first instead of the default
    // polling-then-upgrade dance — cuts a full request/response round trip
    // (plus the later upgrade probe) off every connect and reconnect. Falls
    // back to polling automatically if a network genuinely blocks raw WS.
    transports: ["websocket", "polling"],
    auth: (cb) => cb({ token: getToken() }),
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
