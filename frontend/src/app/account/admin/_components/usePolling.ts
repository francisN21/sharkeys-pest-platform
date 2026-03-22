import { useEffect, useRef } from "react";

/**
 * Calls `fn` on a repeating interval while `enabled` is true.
 * Skips a tick if a previous call is still in flight.
 */
export function usePolling(
  fn: () => Promise<void> | void,
  intervalMs: number,
  enabled = true
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await fnRef.current();
      } finally {
        inFlightRef.current = false;
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
