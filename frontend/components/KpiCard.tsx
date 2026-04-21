import type { ReactNode } from "react";

const ACCENT_STYLES: Record<string, { border: string; icon: string; label: string }> = {
  brand:   { border: "border-t-brand-500",   icon: "bg-brand-50 text-brand-500",   label: "text-brand-600" },
  emerald: { border: "border-t-emerald-500", icon: "bg-emerald-50 text-emerald-500", label: "text-emerald-600" },
  amber:   { border: "border-t-amber-500",   icon: "bg-amber-50 text-amber-500",   label: "text-amber-600" },
  blue:    { border: "border-t-blue-500",    icon: "bg-blue-50 text-blue-500",     label: "text-blue-600" },
};

export default function KpiCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: "brand" | "emerald" | "amber" | "blue";
}) {
  const s = ACCENT_STYLES[accent];

  return (
    <div className={`card p-5 border-t-[3px] ${s.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wider ${s.label}`}>{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 leading-none tracking-tight">
            {value}
          </p>
          {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
        </div>
        {icon && (
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${s.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
