"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardSummary, ReservationStatus } from "@/lib/types";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/Badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLORS: Record<ReservationStatus, string> = {
  Pending: "#f59e0b",
  Confirmed: "#10b981",
  Cancelled: "#d1d5db",
  CheckedIn: "#3b82f6",
  CheckedOut: "#8b5cf6",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  Pending: "Pendiente", Confirmed: "Confirmada", Cancelled: "Cancelada",
  CheckedIn: "Check-in", CheckedOut: "Check-out",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-brand-600">{payload[0].value} reservas</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardSummary>("/api/dashboard/summary"),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Panel operativo</h1>
        <p className="text-sm text-gray-400 mt-0.5">Resumen en tiempo real · actualiza cada 30s</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Hoteles activos"
          value={isLoading ? "—" : data!.hotelesActivos.toLocaleString("es")}
          hint={data ? `${data.totalHoteles.toLocaleString("es")} en catálogo` : undefined}
          accent="brand"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12H4V4zm2 2h2v2H6V6zm0 4h2v2H6v-2zm4-4h2v2h-2V6zm0 4h2v2h-2v-2zm-2 4h4v2H8v-2z" clipRule="evenodd" />
            </svg>
          }
        />
        <KpiCard
          label="Reservas hoy"
          value={isLoading ? "—" : data!.reservasHoy}
          hint="huéspedes actualmente alojados"
          accent="blue"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          }
        />
        <KpiCard
          label="Ocupación 30d"
          value={isLoading ? "—" : `${data!.ocupacionPct.toFixed(1)}%`}
          hint="próximos 30 días"
          accent="emerald"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
            </svg>
          }
        />
        <KpiCard
          label="Ingresos estimados"
          value={isLoading ? "—" : `€${Math.round(data!.ingresosEstimados30d).toLocaleString("es")}`}
          hint="próximos 30 días"
          accent="amber"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Reservas — últimos 7 días</h2>
          <div className="h-56">
            {isLoading && (
              <div className="h-full flex items-end gap-2 px-2">
                {[55, 80, 40, 70, 60, 90, 50].map((h, i) => (
                  <div key={i} className="skeleton flex-1 rounded-t" style={{ height: `${h}%` }} />
                ))}
              </div>
            )}
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tendencia7d.map((p) => ({
                  ...p,
                  label: format(new Date(p.date), "EEE d", { locale: es }),
                }))} barSize={28}>
                  <CartesianGrid vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fdf2f8" }} />
                  <Bar dataKey="reservas" fill="#e91e63" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Por estado</h2>
          <div className="h-56">
            {isLoading && (
              <div className="h-full flex items-center justify-center">
                <div className="skeleton w-32 h-32 rounded-full" />
              </div>
            )}
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.reservasPorEstado.map((s) => ({
                      name: STATUS_LABELS[s.status],
                      value: s.count,
                      status: s.status,
                    }))}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {data.reservasPorEstado.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v} reservas`]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Last reservations */}
      <div className="table-wrap">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Últimas reservas</h2>
          <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5">
            Actualiza cada 30s
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Hotel</th>
              <th>Huésped</th>
              <th>Fechas</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 rounded w-3/4" /></td>
                ))}
              </tr>
            ))}
            {data?.ultimasReservas.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs text-gray-500">{r.code}</td>
                <td>
                  <p className="font-medium text-gray-800">{r.hotelName}</p>
                  <p className="text-xs text-gray-400">{r.roomTypeName}</p>
                </td>
                <td>{r.guestName}</td>
                <td className="text-xs text-gray-500">
                  {format(new Date(r.checkIn), "dd MMM", { locale: es })}
                  <span className="mx-1 text-gray-300">→</span>
                  {format(new Date(r.checkOut), "dd MMM", { locale: es })}
                </td>
                <td className="font-semibold text-gray-800">€{r.totalPrice.toFixed(2)}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
