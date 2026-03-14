import type { AppNotification } from "../../lib/api/notifications";
import type { RealtimeEvent } from "../../lib/realtime/events";

export type NavItem = {
  label: string;
  href: string;
};

export type NavbarApiRole = "customer" | "worker" | "admin";
export type NotificationViewerRole = "customer" | "technician" | "worker" | "admin";

export type NavbarUser = {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  user_role?: NavbarApiRole | null;
  roles?: NavbarApiRole[] | null;
};

export type NavbarNotificationsProps = {
  isAuthed: boolean;
  notifOpen: boolean;
  notifLoading: boolean;
  unreadCount: number;
  notifications: AppNotification[];
  viewerRole: NotificationViewerRole | null;
  browserNotifEnabled: boolean;
  browserNotifPermission: NotificationPermission | "unsupported";
  onOpenNotifications: () => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onNotificationClick: (item: AppNotification) => void | Promise<void>;
  onToggleBrowserNotifications: () => void | Promise<void>;
};

export type NavbarAccountMenuProps = {
  isAuthed: boolean;
  accountOpen: boolean;
  name: string;
  initials: string;
  onToggle: () => void;
  onAccount: () => void;
  onLogout: () => void | Promise<void>;
};

export type NavbarMobileMenuProps = {
  menuOpen: boolean;
  name: string;
  initials: string;
  isAuthed: boolean;
  navItems: NavItem[];
  browserNotifEnabled: boolean;
  browserNotifPermission: NotificationPermission | "unsupported";
  onNavClick: (href: string) => void;
  onCloseMenu: () => void;
  onAccount: () => void;
  onLogout: () => void | Promise<void>;
  onToggleBrowserNotifications: () => void | Promise<void>;
};

export type NotificationPreviewMapper = (evt: RealtimeEvent) => AppNotification | null;