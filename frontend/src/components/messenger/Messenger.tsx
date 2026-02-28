// frontend/src/components/messenger/Messenger.tsx
"use client";

import { useEffect, useRef, useState } from "react";

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

function initials(first?: string | null, last?: string | null) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const out = `${f ? f[0] : ""}${l ? l[0] : ""}`.toUpperCase();
  return out || "??";
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

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" });
}

function bubbleStyle(role: string) {
  switch (role) {
    case "customer":
      return "bg-neutral-100 dark:bg-neutral-800";
    case "worker":
      return "bg-blue-50 dark:bg-blue-950/40";
    case "admin":
    case "superuser":
      return "bg-emerald-50 dark:bg-emerald-950/40";
    default:
      return "bg-neutral-100 dark:bg-neutral-800";
  }
}

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
  const [openProfileFor, setOpenProfileFor] = useState<number | "none">("none");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function startEdit(m: MessengerMessage) {
    setEditingId(m.id);
    setEditDraft(m.body);
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

  async function send(bodyOverride?: string) {
    if (locked) return;

    const body = (bodyOverride ?? draft).trim();
    if (!body) return;
    if (!meUserId) return;

    await onSend(body);
    setDraft("");
  }

  const sendDisabled = !!locked || !meUserId || !!sending || !draft.trim();
  console.log(sendDisabled)

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgb(var(--border))" }}>
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <div>
          <div className="font-semibold">Messages</div>
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Customer • Admin • Technician
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => send("👍")}
            className="rounded-xl border px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            title="Send thumbs up"
            disabled={!!locked || !meUserId || !!sending}
          >
            👍
          </button>

          <button
            type="button"
            onClick={() => setDraft((d) => (d ? d + " 😊" : "😊"))}
            className="rounded-xl border px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            title="Add emoji"
            disabled={!!locked || !meUserId || !!sending}
          >
            😊
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="h-[420px] overflow-y-auto px-4 py-3 space-y-3"
        style={{ background: "rgb(var(--card))" }}
      >
        {messages.length === 0 ? (
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            {locked ? "You don’t have access to this chat." : "No messages yet."}
          </div>
        ) : null}

        {messages.map((m) => {
          const mine = meUserId != null && m.sender_user_id === meUserId;

          const whoInitials = mine ? initials(meFirstName, meLastName) : initials(m.first_name, m.last_name);
          const whoFull = mine ? fullName(meFirstName, meLastName) : fullName(m.first_name, m.last_name);

          const canEdit = mine && m.id > 0 && !locked;

          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenProfileFor((x) => (x === m.id ? "none" : m.id))}
                    className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{ background: "rgba(var(--bg), 0.35)", border: "1px solid rgb(var(--border))" }}
                    title={whoFull}
                  >
                    {whoInitials}
                  </button>

                  {openProfileFor === m.id ? (
                    <div
                      className="absolute z-10 mt-2 w-56 rounded-xl border shadow-sm p-3 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    >
                      <div className="font-semibold">{whoFull}</div>
                      <div className="text-xs mt-1" style={{ color: "rgb(var(--muted))" }}>
                        {roleLabel(m.sender_role)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenProfileFor("none")}
                        className="mt-2 text-xs underline"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        close
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="max-w-[78%]">
                <div
                  className={`rounded-2xl px-3 py-2 border ${bubbleStyle(m.sender_role)}`}
                  style={{ borderColor: "rgb(var(--border))" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {roleLabel(m.sender_role)}
                    </div>

                    {canEdit && editingId !== m.id ? (
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className="text-xs hover:underline"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>

                  {editingId === m.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg px-3 py-2 text-sm border hover:opacity-90"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="rounded-lg px-3 py-2 text-sm border hover:opacity-90"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words text-sm mt-1">{m.body}</div>
                  )}
                </div>

                <div
                  className={`mt-1 text-xs ${mine ? "text-right" : "text-left"}`}
                  style={{ color: "rgb(var(--muted))" }}
                >
                  {formatDateTime(m.created_at)} • Delivered{m.updated_at ? " • Edited" : ""}
                </div>
              </div>

              {mine ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenProfileFor((x) => (x === m.id ? "none" : m.id))}
                    className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{ background: "rgba(var(--bg), 0.35)", border: "1px solid rgb(var(--border))" }}
                    title={whoFull}
                  >
                    {whoInitials}
                  </button>

                  {openProfileFor === m.id ? (
                    <div
                      className="absolute right-0 z-10 mt-2 w-56 rounded-xl border shadow-sm p-3 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    >
                      <div className="font-semibold">{whoFull}</div>
                      <div className="text-xs mt-1" style={{ color: "rgb(var(--muted))" }}>
                        You
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenProfileFor("none")}
                        className="mt-2 text-xs underline"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        close
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
        {locked ? (
          <div className="text-xs mb-2" style={{ color: "rgb(var(--muted))" }}>
            {lockedMessage || "You don’t have access to this chat."}
          </div>
        ) : !meUserId ? (
          <div className="text-xs mb-2" style={{ color: "rgb(var(--muted))" }}>
            Sign in to send messages.
          </div>
        ) : null}

        <div className="flex gap-2 items-end">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sendDisabled) send();
              }
            }}
            placeholder="Message… (Enter to send, Shift+Enter for newline)"
            className="flex-1 rounded-2xl border px-3 py-2 text-sm min-h-[44px]"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            rows={1}
            disabled={!!locked || !meUserId || !!sending}
          />

          <button
            type="button"
            onClick={() => send()}
            disabled={sendDisabled}
            className="rounded-2xl px-4 py-2 text-sm border hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>

        <div className="text-[11px] mt-2" style={{ color: "rgb(var(--muted))" }}>
          Basic emoji supported. Editing is only available for the sender.
        </div>
      </div>
    </div>
  );
}