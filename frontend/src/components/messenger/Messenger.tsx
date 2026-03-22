// frontend/src/components/messenger/Messenger.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, MessageSquare, Pencil, Send, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessengerMessage = {
  id: number;
  sender_user_id: number | null;
  sender_role: "customer" | "admin" | "worker" | "superuser" | string;
  body: string;
  created_at: string;
  updated_at: string | null;
  delivered_at: string | null;
  first_name: string | null;
  last_name: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(first?: string | null, last?: string | null) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const out = `${f ? f[0] : ""}${l ? l[0] : ""}`.toUpperCase();
  return out || "?";
}

function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim() || "Unknown";
}

function roleLabel(role: string) {
  if (role === "worker") return "Technician";
  if (role === "customer") return "Customer";
  if (role === "admin" || role === "superuser") return "Admin";
  return role;
}

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Role → avatar accent colors
function roleMeta(role: string): { ring: string; bg: string; text: string; badge: string } {
  switch (role) {
    case "customer":
      return {
        ring: "rgba(245,158,11,0.5)",
        bg: "rgba(245,158,11,0.12)",
        text: "rgb(253 230 138)",
        badge: "rgba(245,158,11,0.15)",
      };
    case "worker":
      return {
        ring: "rgba(56,189,248,0.5)",
        bg: "rgba(56,189,248,0.12)",
        text: "rgb(186 230 253)",
        badge: "rgba(56,189,248,0.15)",
      };
    case "admin":
    case "superuser":
      return {
        ring: "rgba(52,211,153,0.5)",
        bg: "rgba(52,211,153,0.12)",
        text: "rgb(167 243 208)",
        badge: "rgba(52,211,153,0.15)",
      };
    default:
      return {
        ring: "rgba(255,255,255,0.2)",
        bg: "rgba(255,255,255,0.08)",
        text: "rgb(var(--muted))",
        badge: "rgba(255,255,255,0.08)",
      };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  first,
  last,
  role,
  size = "md",
}: {
  first?: string | null;
  last?: string | null;
  role: string;
  size?: "sm" | "md";
}) {
  const meta = roleMeta(role);
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <div
      className={`shrink-0 ${dim} rounded-full flex items-center justify-center font-bold`}
      style={{
        background: meta.bg,
        boxShadow: `0 0 0 2px ${meta.ring}`,
        color: meta.text,
      }}
    >
      {initials(first, last)}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const meta = roleMeta(role);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: meta.badge, color: meta.text }}
    >
      {roleLabel(role)}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Messenger({
  meUserId,
  meFirstName,
  meLastName,
  messages,
  onSend,
  onEdit,
  sending,
  locked,
  lockedMessage,
}: {
  meUserId: number | null;
  meFirstName?: string | null;
  meLastName?: string | null;
  messages: MessengerMessage[];
  onSend: (body: string) => void | Promise<void>;
  onEdit: (messageId: number, body: string) => void | Promise<void>;
  sending?: boolean;
  locked?: boolean;
  lockedMessage?: string;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Auto-grow compose textarea
  function growTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function startEdit(m: MessengerMessage) {
    setEditingId(m.id);
    setEditDraft(m.body);
    // Focus edit textarea next tick
    setTimeout(() => editTextareaRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit() {
    if (!editingId) return;
    const body = editDraft.trim();
    if (!body) return;
    await onEdit(editingId, body);
    setEditingId(null);
    setEditDraft("");
  }

  async function send() {
    if (locked || !meUserId || sending) return;
    const body = draft.trim();
    if (!body) return;
    await onSend(body);
    setDraft("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  const sendDisabled = !!locked || !meUserId || !!sending || !draft.trim();
  const composeDisabled = !!locked || !meUserId || !!sending;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.01]">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[rgb(var(--muted))]">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">Messages</div>
            <div className="text-xs text-[rgb(var(--muted))]">Customer · Admin · Technician</div>
          </div>
        </div>

        {/* Quick-insert emoji */}
        <div className="flex items-center gap-1.5">
          {(["👍", "✅", "😊", "🙏"] as const).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setDraft((d) => (d ? `${d} ${emoji}` : emoji))}
              disabled={composeDisabled}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-base transition hover:bg-white/[0.07] disabled:opacity-40"
              title={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ minHeight: "320px", maxHeight: "440px" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[rgb(var(--muted))]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="text-sm text-[rgb(var(--muted))]">
              {locked ? "You don't have access to this chat." : "No messages yet. Start the conversation."}
            </div>
          </div>
        ) : null}

        {messages.map((m) => {
          const mine = meUserId != null && m.sender_user_id === meUserId;
          const senderFirst = mine ? meFirstName : m.first_name;
          const senderLast = mine ? meLastName : m.last_name;
          const name = mine ? "You" : fullName(senderFirst, senderLast);
          const canEdit = mine && m.id > 0 && !locked;
          const isEditing = editingId === m.id;
          const wasEdited = !!m.updated_at;
          const isDelivered = !!m.delivered_at;

          return (
            <div
              key={m.id}
              className={`flex items-end gap-2.5 ${mine ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <Avatar first={senderFirst} last={senderLast} role={m.sender_role} />

              {/* Bubble */}
              <div className={`flex max-w-[72%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>

                {/* Sender name + role */}
                <div className={`flex items-center gap-2 px-1 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                  <span className="text-xs font-semibold text-[rgb(var(--fg))]">{name}</span>
                  <RoleBadge role={m.sender_role} />
                </div>

                {/* Message body / edit area */}
                <div
                  className="rounded-2xl border px-3.5 py-2.5 text-sm"
                  style={
                    mine
                      ? {
                          borderColor: "rgba(var(--primary-raw, 56,189,248), 0.3)",
                          background: "rgba(var(--primary-raw, 56,189,248), 0.08)",
                        }
                      : {
                          borderColor: "rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                        }
                  }
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editTextareaRef}
                        value={editDraft}
                        onChange={(e) => {
                          setEditDraft(e.target.value);
                          growTextarea(e.target);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void saveEdit(); }
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
                        rows={2}
                        style={{ minWidth: "220px" }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-[rgb(var(--muted))] transition hover:bg-white/[0.06]"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit()}
                          disabled={!editDraft.trim()}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/[0.08] px-2.5 text-xs font-semibold text-[rgb(var(--fg))] transition hover:bg-white/[0.12] disabled:opacity-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <p className="whitespace-pre-wrap break-words text-[rgb(var(--fg))] leading-relaxed">
                        {m.body}
                      </p>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          className="mt-0.5 shrink-0 rounded-lg p-1 text-[rgb(var(--muted))] transition hover:bg-white/[0.08] hover:text-[rgb(var(--fg))]"
                          title="Edit message"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Timestamp + status */}
                <div className={`flex items-center gap-2 px-1 text-[11px] text-[rgb(var(--muted))] ${mine ? "flex-row-reverse" : "flex-row"}`}>
                  <span>{formatTime(m.created_at)}</span>
                  {isDelivered ? (
                    <span className="opacity-60">· Delivered</span>
                  ) : null}
                  {wasEdited ? (
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px]">
                      Edited
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compose footer */}
      <div className="border-t border-white/[0.07] bg-white/[0.02] p-3">
        {locked ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-xs text-[rgb(var(--muted))]">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            {lockedMessage || "You don't have access to this chat."}
          </div>
        ) : !meUserId ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-xs text-[rgb(var(--muted))]">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Sign in to send messages.
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              growTextarea(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sendDisabled) void send();
              }
            }}
            placeholder="Message… (Enter to send)"
            rows={1}
            disabled={composeDisabled}
            className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50 transition"
            style={{ minHeight: "44px", maxHeight: "160px" }}
          />

          <button
            type="button"
            onClick={() => void send()}
            disabled={sendDisabled}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary))] text-[rgb(var(--primary-fg))] shadow-md shadow-black/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            title="Send message"
          >
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-[11px] text-[rgb(var(--muted))]">
            Shift+Enter for newline · Only you can edit your messages
          </span>
          {draft.length > 0 ? (
            <span className="text-[11px] text-[rgb(var(--muted))]">{draft.length}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
