"use client";

import { useEffect, useRef } from "react";
import type { RealtimeEvent } from "./events";
import { notifyFromEvent } from "./notifyFromEvent";

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
        // connection established
      };

      const onMessage = (ev: MessageEvent) => {
        try {
          const evt = JSON.parse(String(ev.data)) as RealtimeEvent | { type: string };

          if (!evt || typeof evt !== "object" || !("type" in evt)) return;

          if (evt.type === "pong" || evt.type === "system.connected" || evt.type === "system.identified") {
            return;
          }

          notifyFromEvent(evt as RealtimeEvent);
        } catch {
          // ignore bad payloads
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
        } catch {}
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
        } catch {}
      }

      wsRef.current = null;
    };
  }, [url]);

  return wsRef;
}