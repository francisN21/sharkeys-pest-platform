"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import NotificationDropdown from "../notifications/NotificationDropdown";
import type { NavbarNotificationsProps } from "./navbar.types";

type Props = NavbarNotificationsProps & {
  notifRef: React.RefObject<HTMLDivElement | null>;
};

export default function NavbarNotifications({
  isAuthed,
  notifOpen,
  notifLoading,
  unreadCount,
  notifications,
  viewerRole,
  browserNotifEnabled,
  browserNotifPermission,
  onOpenNotifications,
  onMarkAllRead,
  onNotificationClick,
  onToggleBrowserNotifications,
  notifRef,
}: Props) {
  const prevCountRef = useRef(unreadCount);
  const [bellRinging, setBellRinging] = useState(false);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setBellRinging(true);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  if (!isAuthed) return null;

  return (
    <div className="relative shrink-0" ref={notifRef}>
      <button
        type="button"
        onClick={() => void onOpenNotifications()}
        className="relative rounded-xl border p-2.5 shadow-sm hover:opacity-90"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--card))",
        }}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={notifOpen}
      >
        <span
          className={bellRinging ? "bell-ring" : undefined}
          onAnimationEnd={() => setBellRinging(false)}
        >
          <Bell className="h-5 w-5" />
        </span>

        {unreadCount > 0 ? (
          <span
            key={unreadCount}
            className="badge-pop absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold"
            style={{
              background: "rgb(239 68 68)",
              color: "white",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <NotificationDropdown
        open={notifOpen}
        loading={notifLoading}
        notifications={notifications}
        unreadCount={unreadCount}
        viewerRole={viewerRole}
        onMarkAllRead={onMarkAllRead}
        onNotificationClick={onNotificationClick}
        browserNotifEnabled={browserNotifEnabled}
        browserNotifPermission={browserNotifPermission}
        onToggleBrowserNotifications={onToggleBrowserNotifications}
      />
    </div>
  );
}
