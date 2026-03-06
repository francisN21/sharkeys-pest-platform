"use client";

export async function notifyBrowser(title: string, body?: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission === "denied") return;

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    new Notification(title, { body });
  }
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined") return "unsupported" as const;
  if (!("Notification" in window)) return "unsupported" as const;

  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;

  const p = await Notification.requestPermission();
  return p as "granted" | "denied" | "default";
}