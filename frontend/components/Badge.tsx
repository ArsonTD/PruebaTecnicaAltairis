import clsx from "clsx";
import type { ReservationStatus } from "@/lib/types";

const STATUS_STYLES: Record<ReservationStatus, { label: string; className: string }> = {
  Pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  Confirmed: { label: "Confirmada", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  Cancelled: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border border-gray-200" },
  CheckedIn: { label: "Check-in", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  CheckedOut: { label: "Check-out", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
};

export default function StatusBadge({ status }: { status: ReservationStatus }) {
  const s = STATUS_STYLES[status];
  return <span className={clsx("badge", s.className)}>{s.label}</span>;
}

export function StarsBadge({ stars }: { stars: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400 text-xs">
      {Array.from({ length: stars }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </span>
  );
}
