"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BadgeDollarSign, CheckCircle2, ClipboardList, X } from "lucide-react";
import {
  getAdminTechBookingDetail,
  type TechBookingDetail,
} from "../../../../../../lib/api/adminTechBookings";
import SectionCard from "../../../components/SectionCard";

function formatMoney(cents: number | null | undefined) {
  const amount = (Number(cents) || 0) / 100;
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </div>
      <div className={`mt-1 break-words text-sm ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function AdminCompletedBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = typeof params?.id === "string" ? params.id : "";

  const [detail, setDetail] = useState<TechBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await getAdminTechBookingDetail(bookingId);
        if (!alive) return;
        setDetail(res.booking);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load booking");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [bookingId]);

  const shortId = detail?.public_id ? detail.public_id.slice(-8) : bookingId.slice(-8);

  const workerName = [detail?.worker_first_name, detail?.worker_last_name]
    .filter(Boolean).join(" ") || "—";

  const customerName = [
    detail?.customer_first_name ?? detail?.lead_first_name,
    detail?.customer_last_name ?? detail?.lead_last_name,
  ].filter(Boolean).join(" ") || "—";

  const address = detail?.address_line1 || "—";

  return (
    <main className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.push("/account/admin/customers")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
          >
            ← Back to Customers
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[rgb(var(--fg))]">
                {detail?.service_title ?? "Completed Booking"}
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: "rgba(34,197,94,0.30)",
                  background: "rgba(34,197,94,0.12)",
                  color: "rgb(187 247 208)",
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </span>
            </div>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">Booking #{shortId}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {err ? (
        <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{err}</span>
          <button type="button" onClick={() => setErr(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading booking…
        </div>
      ) : null}

      {!loading && detail ? (
        <>
          {/* Final Price */}
          <SectionCard
            title="Final Price"
            subtitle="Price set by the technician upon completion."
            icon={<BadgeDollarSign className="h-5 w-5" />}
          >
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                Effective Price
              </div>
              <div className="mt-1 text-2xl font-bold text-[rgb(var(--fg))]">
                {formatMoney(detail.effective_price_cents)}
              </div>
              {detail.service_base_price_cents != null && (
                <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                  Base price: {formatMoney(detail.service_base_price_cents)}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Booking Information */}
          <SectionCard
            title="Booking Information"
            subtitle="Service, schedule, address, and completion details."
            icon={<ClipboardList className="h-5 w-5" />}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailRow label="Service" value={detail.service_title ?? "—"} />
              <DetailRow label="Status" value="Completed" />
              <DetailRow label="Scheduled Start" value={formatDateTime(detail.starts_at)} />
              <DetailRow label="Scheduled End" value={formatDateTime(detail.ends_at)} />
              <DetailRow label="Completed At" value={formatDateTime(detail.completed_at)} />
              <DetailRow label="Booking ID" value={detail.public_id} mono />
              <div className="sm:col-span-2">
                <DetailRow label="Address" value={address} />
              </div>
              {detail.booking_notes ? (
                <div className="sm:col-span-2">
                  <DetailRow label="Notes" value={detail.booking_notes} />
                </div>
              ) : null}
            </div>
          </SectionCard>

          {/* Customer */}
          <SectionCard
            title="Customer"
            subtitle="Contact and account information."
            icon={<ClipboardList className="h-5 w-5" />}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailRow label="Name" value={customerName} />
              <DetailRow
                label="Email"
                value={detail.customer_email ?? detail.lead_email ?? "—"}
              />
              <DetailRow
                label="Phone"
                value={detail.customer_phone ?? detail.lead_phone ?? "—"}
              />
              <DetailRow
                label="Account Type"
                value={detail.customer_account_type ?? detail.lead_account_type ?? "—"}
              />
            </div>
          </SectionCard>

          {/* Technician */}
          {detail.worker_user_id ? (
            <SectionCard
              title="Technician"
              subtitle="Worker who completed this booking."
              icon={<ClipboardList className="h-5 w-5" />}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <DetailRow label="Name" value={workerName} />
                <DetailRow label="Email" value={detail.worker_email ?? "—"} />
                <DetailRow label="Phone" value={detail.worker_phone ?? "—"} />
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
