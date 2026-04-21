"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Hotel, MaintenancePriority, MaintenanceStatus, Paged, RoomMaintenance, RoomType } from "@/lib/types";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const STATUSES: MaintenanceStatus[] = ["Open", "InProgress", "Resolved"];
const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  Open: "Abierto", InProgress: "En progreso", Resolved: "Resuelto",
};

const PRIORITIES: MaintenancePriority[] = ["Low", "Medium", "High", "Critical"];
const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  Low: "Baja", Medium: "Media", High: "Alta", Critical: "Crítica",
};

const PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  Low:      "bg-gray-100 text-gray-600",
  Medium:   "bg-amber-50 text-amber-700",
  High:     "bg-orange-50 text-orange-700",
  Critical: "bg-red-50 text-red-700",
};

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  Open:       "bg-blue-50 text-blue-700",
  InProgress: "bg-amber-50 text-amber-700",
  Resolved:   "bg-emerald-50 text-emerald-700",
};

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${PRIORITY_COLORS[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function MantenimientoPage() {
  const [hotelId, setHotelId]         = useState("");
  const [hotelLabel, setHotelLabel]   = useState("");
  const [hotelSearch, setHotelSearch] = useState("");
  const [showHotelDrop, setShowHotelDrop] = useState(false);
  const [roomTypeId, setRoomTypeId]   = useState("");
  const [status, setStatus]           = useState<MaintenanceStatus | "">("");
  const [page, setPage]               = useState(1);
  const [open, setOpen]               = useState(false);
  const qc = useQueryClient();
  const hotelRef = useRef<HTMLDivElement>(null);

  const debouncedHotelSearch = useDebounce(hotelSearch, 300);
  const hasFilters = !!(hotelId || roomTypeId || status);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (hotelRef.current && !hotelRef.current.contains(e.target as Node))
        setShowHotelDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setPage(1); }, [hotelId, roomTypeId, status]);

  const queryKey = useMemo(
    () => ["maintenance", { hotelId, roomTypeId, status, page }],
    [hotelId, roomTypeId, status, page]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (hotelId)    p.set("hotelId", hotelId);
      if (roomTypeId) p.set("roomTypeId", roomTypeId);
      if (status)     p.set("status", status);
      p.set("page", String(page));
      p.set("pageSize", "20");
      return api<Paged<RoomMaintenance>>(`/api/maintenance?${p}`);
    },
  });

  const { data: hotelResults } = useQuery({
    queryKey: ["hotels-filter-maint", debouncedHotelSearch],
    queryFn: () => {
      const p = new URLSearchParams();
      if (debouncedHotelSearch) p.set("search", debouncedHotelSearch);
      p.set("pageSize", "8");
      return api<Paged<Hotel>>(`/api/hotels?${p}`);
    },
    enabled: showHotelDrop && debouncedHotelSearch.length > 0,
  });

  const { data: filterRoomTypes } = useQuery({
    queryKey: ["roomtypes-filter-maint", hotelId],
    queryFn: () => api<RoomType[]>(`/api/roomtypes?hotelId=${hotelId}`),
    enabled: !!hotelId,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
      api<RoomMaintenance>(`/api/maintenance/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function clearFilters() {
    setHotelId(""); setHotelLabel(""); setHotelSearch("");
    setRoomTypeId(""); setStatus("");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mantenimiento</h1>
          <p className="text-sm text-gray-400">
            {data ? `${data.total.toLocaleString("es")} incidencias` : "…"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Nuevo incidente</button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Hotel */}
          <div className="w-60 relative" ref={hotelRef}>
            <label className="label">Hotel</label>
            {hotelId ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-brand-300 bg-brand-50 text-sm text-brand-800 font-medium">
                <span className="flex-1 truncate">{hotelLabel}</span>
                <button
                  type="button"
                  onClick={() => { setHotelId(""); setHotelLabel(""); setHotelSearch(""); setRoomTypeId(""); }}
                  className="text-brand-400 hover:text-brand-700 shrink-0"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="Buscar hotel…"
                  value={hotelSearch}
                  onChange={(e) => { setHotelSearch(e.target.value); setShowHotelDrop(true); }}
                  onFocus={() => setShowHotelDrop(true)}
                />
                {showHotelDrop && hotelSearch && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto">
                    {!hotelResults && (
                      <p className="px-3 py-2 text-xs text-gray-400">Buscando…</p>
                    )}
                    {hotelResults?.items.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                        onClick={() => {
                          setHotelId(h.id); setHotelLabel(h.name);
                          setHotelSearch(h.name); setShowHotelDrop(false);
                        }}
                      >
                        <p className="font-medium text-gray-800 truncate">{h.name}</p>
                        <p className="text-xs text-gray-400">{h.city}</p>
                      </button>
                    ))}
                    {hotelResults?.items.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tipo de habitación */}
          <div className="w-52">
            <label className="label">Tipo de habitación</label>
            <select
              className="input"
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              disabled={!hotelId}
            >
              <option value="">Todos</option>
              {filterRoomTypes?.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="w-40">
            <label className="label">Estado</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as MaintenanceStatus | "")}
            >
              <option value="">Todos</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          {hasFilters && (
            <button
              className="btn btn-ghost text-xs text-gray-400 hover:text-gray-700 self-end mb-0.5"
              onClick={clearFilters}
            >
              × Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Habitación</th>
              <th>Hotel / Tipo</th>
              <th>Título</th>
              <th>Prioridad</th>
              <th>Fechas afectadas</th>
              <th className="w-44">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 rounded w-3/4" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-12">
                  <p className="text-sm">Sin incidencias para los filtros seleccionados</p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-xs text-brand-500 hover:underline">
                      Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            )}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td>
                  <p className="font-mono text-sm font-semibold text-gray-800">{m.roomIdentifier}</p>
                  {m.inventoryBlocked && (
                    <span className="text-[10px] text-orange-500 font-medium">inventario bloqueado</span>
                  )}
                </td>
                <td>
                  <p className="font-medium text-gray-800">{m.hotelName}</p>
                  <p className="text-xs text-gray-400">{m.roomTypeName}</p>
                </td>
                <td>
                  <p className="font-medium text-gray-800 max-w-xs truncate">{m.title}</p>
                  {m.description && (
                    <p className="text-xs text-gray-400 max-w-xs truncate">{m.description}</p>
                  )}
                </td>
                <td><PriorityBadge priority={m.priority} /></td>
                <td className="text-xs text-gray-600">
                  <p>{format(new Date(m.affectedFrom), "dd MMM yyyy", { locale: es })}</p>
                  <p className="text-gray-400">→ {format(new Date(m.affectedTo), "dd MMM yyyy", { locale: es })}</p>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <select
                      className="text-xs px-2 py-1 rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 cursor-pointer"
                      value={m.status}
                      onChange={(e) => patchMutation.mutate({ id: m.id, status: e.target.value as MaintenanceStatus })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                    <StatusBadge status={m.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={data?.totalPages ?? 1}
          total={data?.total ?? 0}
          label="incidencias"
          onPageChange={setPage}
        />
      </div>

      <CreateMaintenanceModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateMaintenanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const today = useMemo(() => new Date(), []);

  const [hotelSearch, setHotelSearch] = useState("");
  const [hotelId, setHotelId]         = useState<string | null>(null);
  const [roomTypeId, setRoomTypeId]   = useState("");
  const [roomIdentifier, setRoomIdentifier] = useState("");
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState<MaintenancePriority>("Medium");
  const [affectedFrom, setAffectedFrom] = useState(format(addDays(today, 1), "yyyy-MM-dd"));
  const [affectedTo, setAffectedTo]     = useState(format(addDays(today, 8), "yyyy-MM-dd"));
  const [blockInventory, setBlockInventory] = useState(true);

  const { data: hotelsPage } = useQuery({
    queryKey: ["hotels-picker-maint", hotelSearch],
    queryFn: () => {
      const p = new URLSearchParams();
      if (hotelSearch) p.set("search", hotelSearch);
      p.set("pageSize", "10");
      return api<Paged<Hotel>>(`/api/hotels?${p}`);
    },
    enabled: open && hotelSearch.length > 0,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["roomtypes-maint", hotelId],
    queryFn: () => api<RoomType[]>(`/api/roomtypes?hotelId=${hotelId}`),
    enabled: !!hotelId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          hotelId, roomTypeId, roomIdentifier, title, description,
          priority, affectedFrom, affectedTo, blockInventory,
        }),
      }),
    onSuccess: () => {
      toast.success("Incidente registrado");
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      onClose();
      setHotelId(null); setHotelSearch(""); setRoomTypeId("");
      setRoomIdentifier(""); setTitle(""); setDescription("");
      setPriority("Medium"); setBlockInventory(true);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const canSubmit = hotelId && roomTypeId && roomIdentifier.trim() && title.trim() && affectedFrom && affectedTo;

  return (
    <Modal open={open} onClose={onClose} title="Nuevo incidente de mantenimiento" maxWidth="max-w-xl">
      <form
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }}
        className="space-y-4"
      >
        {/* Hotel picker */}
        {!hotelId ? (
          <div>
            <label className="label">Hotel</label>
            <input
              className="input"
              placeholder="Buscar hotel..."
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              autoFocus
            />
            {hotelSearch && hotelsPage && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-auto">
                {hotelsPage.items.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => { setHotelId(h.id); setHotelSearch(h.name); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                  >
                    <p className="font-medium">{h.name}</p>
                    <p className="text-xs text-gray-500">{h.city}, {h.country}</p>
                  </button>
                ))}
                {hotelsPage.items.length === 0 && (
                  <p className="p-3 text-sm text-gray-400">Sin resultados</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg bg-brand-50 border border-brand-200">
            <p className="text-sm font-medium text-brand-800">{hotelSearch}</p>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => { setHotelId(null); setRoomTypeId(""); setHotelSearch(""); }}
            >
              Cambiar
            </button>
          </div>
        )}

        {/* Room type */}
        {hotelId && (
          <div>
            <label className="label">Tipo de habitación</label>
            <select
              className="input"
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {roomTypes?.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} · {rt.totalRooms} habitaciones
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Room identifier + priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nº habitación</label>
            <input
              className="input"
              placeholder="Ej: 101, Suite 3A"
              value={roomIdentifier}
              onChange={(e) => setRoomIdentifier(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Prioridad</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Título del incidente</label>
          <input
            className="input"
            placeholder="Ej: Baño tapado, AC averiado..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea
            className="input min-h-[72px] resize-none"
            placeholder="Detalles del problema..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fuera de servicio desde</label>
            <input
              className="input"
              type="date"
              value={affectedFrom}
              onChange={(e) => setAffectedFrom(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Hasta (excl.)</label>
            <input
              className="input"
              type="date"
              value={affectedTo}
              onChange={(e) => setAffectedTo(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Block inventory */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            checked={blockInventory}
            onChange={(e) => setBlockInventory(e.target.checked)}
          />
          <div>
            <p className="text-sm font-medium text-gray-800">Reducir disponibilidad en inventario</p>
            <p className="text-xs text-gray-400">Descuenta 1 habitación del inventario en las fechas afectadas</p>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Crear incidente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
