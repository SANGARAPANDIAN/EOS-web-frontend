"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueueSocket, disconnectQueueSocket, type DisplayScreen } from "./queueSocket";
import { kitchenQueueKey, type KitchenQueuePayload } from "../api/kitchenQueue";
import { counterQueueKey, type CounterQueuePayload } from "../api/counterQueue";

/**
 * Shared connect/subscribe/resync wiring for both display kiosks. Every push
 * is a full-snapshot replace (never an incremental diff) — the only model
 * that's trivially idempotent for an unattended kiosk reconnect or a second
 * browser tab open on the same screen. On every `connect` event (first
 * connect, reconnect-after-drop, and reconnect-after-backend-restart all
 * look identical from here) a REST refetch resyncs fully, on top of the
 * server's own immediate post-join snapshot — so nothing is ever silently
 * stale for long even across a backend deploy.
 */
export function useQueueSocket(screen: DisplayScreen): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getQueueSocket(screen);
    const queryKey = screen === "kitchen" ? kitchenQueueKey : counterQueueKey;
    const eventName = screen === "kitchen" ? "kitchen:queue" : "counter:queue";

    function onSnapshot(payload: KitchenQueuePayload | CounterQueuePayload) {
      queryClient.setQueryData(queryKey, payload);
    }
    function onConnect() {
      queryClient.invalidateQueries({ queryKey });
    }

    socket.on(eventName, onSnapshot);
    socket.on("connect", onConnect);
    socket.connect();

    return () => {
      socket.off(eventName, onSnapshot);
      socket.off("connect", onConnect);
      disconnectQueueSocket(screen);
    };
  }, [screen, queryClient]);
}
