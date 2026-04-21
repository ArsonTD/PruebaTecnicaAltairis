"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Hotel, Paged, Reservation, ReservationStatus, RoomType } from "@/lib/types";
import StatusBadge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const STATUSES: ReservationStatus[] = ["Pending", "Confirmed", "Cancelled", "CheckedIn", "CheckedOut"];
const STATUS_LABELS: Record<ReservationStatus, string> = {
  Pending: "Pendiente", Confirmed: "Confirmada", Cancelled: "Cancelada",
  CheckedIn: "Check-in", CheckedOut: "Check-out",
};

function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function ReservasPage() {
  const [status, setStatus]       = useState<ReservationStatus | "">("");
  const [hotelId, setHotelId]     = useState("");
  const [hotelLabel, setHotelLabel] = useState("");
  const [hotelSearch, setHotelSearch] = useState("");
  const [showHotelDrop, setShowHotelDrop] = useState(false);
  const [guest, setGuest]         = useState("");
  const [checkFrom, setCheckFrom] = useState("");
  const [checkTo, setCheckTo]     = useState("");
  const [page, setPage]           = useState(1);
  const [open, setOpen]           = useState(false);
  const qc = useQueryClient();
  const hotelRef = useRef<HTMLDivElement>(null);

  const debouncedHotelSearch = useDebounce(hotelSearch, 300);
  const debouncedGuest       = useDebounce(guest, 350);

  const hasFilters = !!(status || hotelId || guest || checkFrom || checkTo);

  // close hotel dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (hotelRef.current && !hotelRef.current.contains(e.target as Node))
        setShowHotelDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // reset page when any filter changes
  useEffect(() => { setPage(1); }, [status, hotelId, debouncedGuest, checkFrom, checkTo]);

  const queryKey = useMemo(
    () => ["reservations", { status, hotelId, guest: debouncedGuest, checkFrom, checkTo, page }],
    [status, hotelId, debouncedGuest, checkFrom, checkTo, page]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (status)          p.set("status", status);
      if (hotelId)         p.set("hotelId", hotelId);
      if (debouncedGuest)  p.set("guest", debouncedGuest);
      if (checkFrom)       p.set("checkFrom", checkFrom);
      if (checkTo)         p.set("checkTo", checkTo);
      p.set("page", String(page));
      p.set("pageSize", "20");
      return api<Paged<Reservation>>(`/api/reservations?${p}`);
    },
  });

  const { data: hotelResults } = useQuery({
    queryKey: ["hotels-filter", debouncedHotelSearch],
    queryFn: () => {
      const p = new URLSearchParams();
      if (debouncedHotelSearch) p.set("search", debouncedHotelSearch);
      p.set("pageSize", "8");
      return api<Paged<Hotel>>(`/api/hotels?${p}`);
    },
    enabled: showHotelDrop && debouncedHotelSearch.length > 0,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      api<Reservation>(`/api/reservations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function clearFilters() {
    setStatus(""); setHotelId(""); setHotelLabel(""); setHotelSearch("");
    setGuest(""); setCheckFrom(""); setCheckTo("");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reservas</h1>
          <p className="text-sm text-gray-400">
            {data ? `${data.total.toLocaleString("es")} reservas` : "…"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Nueva reserva</button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Estado */}
          <div className="w-44">
            <label className="label">Estado</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReservationStatus | "")}
            >
              <option value="">Todos</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          {/* Hotel */}
          <div className="w-60 relative" ref={hotelRef}>
            <label className="label">Hotel</label>
            {hotelId ? (
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-brand-300 bg-brand-50 text-sm text-brand-800 font-medium">
                <span className="flex-1 truncate">{hotelLabel}</span>
                <button
                  type="button"
                  onClick={() => { setHotelId(""); setHotelLabel(""); setHotelSearch(""); }}
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

          {/* Huésped */}
          <div className="flex-1 min-w-[200px]">
            <label className="label">Huésped</label>
            <input
              className="input"
              placeholder="Nombre o email…"
              value={guest}
              onChange={(e) => setGuest(e.target.value)}
            />
          </div>

          {/* Fechas */}
          <div className="w-36">
            <label className="label">Check-in desde</label>
            <input
              className="input"
              type="date"
              value={checkFrom}
              onChange={(e) => setCheckFrom(e.target.value)}
            />
          </div>
          <div className="w-36">
            <label className="label">Check-out hasta</label>
            <input
              className="input"
              type="date"
              value={checkTo}
              onChange={(e) => setCheckTo(e.target.value)}
            />
          </div>

          {/* Clear */}
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
              <th>Código</th>
              <th>Hotel</th>
              <th>Huésped</th>
              <th>Fechas</th>
              <th className="w-20">Hab.</th>
              <th className="w-28">Total</th>
              <th className="w-44">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 rounded w-3/4" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-12">
                  <p className="text-sm">Sin reservas para los filtros seleccionados</p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-xs text-brand-500 hover:underline">
                      Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            )}
            {data?.items.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs text-gray-500">{r.code}</td>
                <td>
                  <p className="font-medium text-gray-800">{r.hotelName}</p>
                  <p className="text-xs text-gray-400">{r.roomTypeName}</p>
                </td>
                <td>
                  <p className="font-medium text-gray-800">{r.guestName}</p>
                  <p className="text-xs text-gray-400">{r.guestEmail}</p>
                </td>
                <td className="text-xs text-gray-600">
                  <p>{format(new Date(r.checkIn), "dd MMM yyyy", { locale: es })}</p>
                  <p className="text-gray-400">→ {format(new Date(r.checkOut), "dd MMM yyyy", { locale: es })}</p>
                </td>
                <td className="text-gray-700">{r.rooms}</td>
                <td className="font-semibold text-gray-800">€{r.totalPrice.toFixed(2)}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    <select
                      className="text-xs px-2 py-1 rounded border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 cursor-pointer"
                      value={r.status}
                      onChange={(e) => patchMutation.mutate({ id: r.id, status: e.target.value as ReservationStatus })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                    <StatusBadge status={r.status} />
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
          label="reservas"
          onPageChange={setPage}
        />
      </div>

      <CreateReservationModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateReservationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [hotelSearch, setHotelSearch] = useState("");
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const [checkIn, setCheckIn] = useState(format(addDays(today, 1), "yyyy-MM-dd"));
  const [checkOut, setCheckOut] = useState(format(addDays(today, 3), "yyyy-MM-dd"));
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [rooms, setRooms] = useState(1);

  const { data: hotelsPage } = useQuery({
    queryKey: ["hotels-picker-res", hotelSearch],
    queryFn: () => {
      const p = new URLSearchParams();
      if (hotelSearch) p.set("search", hotelSearch);
      p.set("pageSize", "10");
      return api<Paged<Hotel>>(`/api/hotels?${p}`);
    },
    enabled: open && hotelSearch.length > 0,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["roomtypes", hotelId],
    queryFn: () => api<RoomType[]>(`/api/roomtypes?hotelId=${hotelId}`),
    enabled: !!hotelId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api("/api/reservations", {
        method: "POST",
        body: JSON.stringify({ hotelId, roomTypeId, guestName, guestEmail, checkIn, checkOut, rooms }),
      }),
    onSuccess: () => {
      toast.success("Reserva creada");
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
      setHotelId(null); setRoomTypeId(null); setGuestName(""); setGuestEmail(""); setRooms(1);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const canSubmit = hotelId && roomTypeId && guestName && guestEmail && checkIn && checkOut;

  return (
    <Modal open={open} onClose={onClose} title="Nueva reserva" maxWidth="max-w-xl">
      <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }} className="space-y-4">
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
            <button type="button" className="btn btn-ghost text-xs"
              onClick={() => { setHotelId(null); setRoomTypeId(null); setHotelSearch(""); }}>
              Cambiar
            </button>
          </div>
        )}

        {hotelId && (
          <div>
            <label className="label">Tipo de habitación</label>
            <select className="input" value={roomTypeId ?? ""} onChange={(e) => setRoomTypeId(e.target.value || null)}>
              <option value="">Seleccionar...</option>
              {roomTypes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · cap. {r.capacity} · desde €{r.basePrice.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Check-in</label>
            <input className="input" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input className="input" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
          </div>
          <div>
            <label className="label">Habitaciones</label>
            <input className="input" type="number" min={1} max={50}
              value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre del huésped</label>
            <input className="input" required value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Creando…" : "Crear reserva"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
