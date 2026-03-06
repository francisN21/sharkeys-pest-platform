"use client";

import { useEffect, useRef } from "react";
import type { RealtimeEvent } from "./events";
import { notifyFromEvent } from "./notifyFromEvent";

export function useRealtime(url: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    let closedByCleanup = false;

    const connect = () => {
      if (closedByCleanup) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("message", (ev: MessageEvent) => {
        try {
          const evt = JSON.parse(String(ev.data)) as RealtimeEvent;
          notifyFromEvent(evt);
        } catch {
          // ignore invalid payloads
        }
      });

      ws.addEventListener("close", () => {
        wsRef.current = null;
        if (closedByCleanup) return;

        // basic reconnect (2s).
        reconnectTimer.current = window.setTimeout(connect, 2000);
      });

      ws.addEventListener("error", () => {
        // close triggers reconnect
        try {
          ws.close();
        } catch {}
      });
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
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