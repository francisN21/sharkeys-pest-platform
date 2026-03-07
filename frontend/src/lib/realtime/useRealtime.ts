"use client";

import { useEffect, useRef } from "react";
import type { RealtimeEvent } from "./events";
import { notifyFromEvent } from "./notifyFromEvent";

type SystemEvent =
  | { type: "system.connected"; at?: string; userId?: number | null; roles?: string[] }
  | { type: "system.identified"; at?: string; userId?: number | null; roles?: string[] }
  | { type: "pong"; at?: string };

function isSystemEvent(evt: unknown): evt is SystemEvent {
  if (!evt || typeof evt !== "object") return false;
  const type = (evt as { type?: unknown }).type;
  return (
    type === "system.connected" ||
    type === "system.identified" ||
    type === "pong"
  );
}

export function useRealtime(url?: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!url) return;

    let disposed = false;

    const connect = () => {
      if (disposed) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      const onOpen = () => {
        // connected
      };

      const onMessage = (ev: MessageEvent) => {
        try {
          const parsed = JSON.parse(String(ev.data));

          if (isSystemEvent(parsed)) {
            return;
          }

          notifyFromEvent(parsed as RealtimeEvent);
        } catch {
          // ignore malformed payloads
        }
      };

      const onClose = () => {
        wsRef.current = null;

        if (disposed) return;

        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, 2000);
      };

      const onError = () => {
        try {
          ws.close();
        } catch {
          // ignore
        }
      };

      ws.addEventListener("open", onOpen);
      ws.addEventListener("message", onMessage);
      ws.addEventListener("close", onClose);
      ws.addEventListener("error", onError);

      return () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("message", onMessage);
        ws.removeEventListener("close", onClose);
        ws.removeEventListener("error", onError);
      };
    };

    const cleanup = connect();

    return () => {
      disposed = true;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      cleanup?.();

      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }

      wsRef.current = null;
    };
  }, [url]);

  return wsRef;
}