import { io, type Socket } from "socket.io-client";

// Same derivation as src/lib/realtime/socket.ts — the REST base URL includes
// the /api/v1 prefix; Socket.IO connects at the server root and addresses
// its own namespace, so that prefix is stripped here too.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
const WS_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export type DisplayScreen = "kitchen" | "counter";

const sockets: Partial<Record<DisplayScreen, Socket>> = {};

/**
 * One socket per display-screen type, deliberately separate from
 * src/lib/realtime/socket.ts's `/messaging` singleton — different auth
 * shape entirely (no JWT; these are public, unauthenticated kiosk routes,
 * see canteen-queue.gateway.ts). Each kiosk device only ever runs one of
 * these two pages, so caching by screen type (rather than a single shared
 * singleton) is simplest.
 */
export function getQueueSocket(screen: DisplayScreen): Socket {
  const existing = sockets[screen];
  if (existing) return existing;
  const socket = io(`${WS_ORIGIN}/canteen-queue`, {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    transports: ["websocket", "polling"],
    query: { screen },
  });
  sockets[screen] = socket;
  return socket;
}

export function disconnectQueueSocket(screen: DisplayScreen): void {
  sockets[screen]?.disconnect();
}
