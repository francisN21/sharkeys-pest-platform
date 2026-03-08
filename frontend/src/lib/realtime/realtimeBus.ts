"use client";

import type { RealtimeEvent } from "./events";

const REALTIME_EVENT_NAME = "spc:realtime-event";

export function publishRealtimeEvent(evt: RealtimeEvent) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<RealtimeEvent>(REALTIME_EVENT_NAME, {
      detail: evt,
    })
  );
}

export function subscribeRealtimeEvent(
  handler: (evt: RealtimeEvent) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<RealtimeEvent>;
    if (!custom.detail) return;
    handler(custom.detail);
  };

  window.addEventListener(REALTIME_EVENT_NAME, listener as EventListener);

  return () => {
    window.removeEventListener(REALTIME_EVENT_NAME, listener as EventListener);
  };
}