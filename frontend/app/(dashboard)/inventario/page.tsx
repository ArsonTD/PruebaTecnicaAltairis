"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getHub } from "@/lib/signalr";
import { useAuthStore } from "@/store/auth";
import type { Hotel, InventoryDay, Paged, RoomType } from "@/lib/types";
import { format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import clsx from "clsx";
import { toast } from "sonner";

const DAYS = 30;

function colorForAvailability(n: number) {
  if (n === 0) return "bg-red-100 text-red-700 border-red-200";
  if (n <= 5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function InventarioPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();

  const [hotelSearch, setHotelSearch] = useState("");
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const dates = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(today, i)),
    [today]
  );
  const fromStr = format(dates[0], "yyyy-MM-dd");
  const toStr = format(dates[dates.length - 1], "yyyy-MM-dd");

  const { data: hotelsPage } = useQuery({
    queryKey: ["hotels-picker", hotelSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (hotelSearch) params.set("search", hotelSearch);
      params.set("pageSize", "10");
      return api<Paged<Hotel>>(`/api/hotels?${params}`);
    },
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["roomtypes", selectedHotelId],
    queryFn: () => api<RoomType[]>(`/api/roomtypes?hotelId=${selectedHotelId}`),
    enabled: !!selectedHotelId,
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory", selectedHotelId, fromStr, toStr],
    queryFn: () =>
      api<InventoryDay[]>(
        `/api/inventory?hotelId=${selectedHotelId}&from=${fromStr}&to=${toStr}`
      ),
    enabled: !!selectedHotelId,
  });

  const invMap = useMemo(() => {
    const m = new Map<string, InventoryDay>();
    (inventory || []).forEach((i) => m.set(`${i.roomTypeId}|${i.date}`, i));
    return m;
  }, [inventory]);

  const [pulseKey, setPulseKey] = useState<Record<string, number>>({});
  const pulse = (key: string) => setPulseKey((p) => ({ ...p, [key]: (p[key] || 0) + 1 }));

  // SignalR live updates for selected hotel
  useEffect(() => {
    if (!selectedHotelId || !token) return;
    let active = true;

    (async () => {
      const hub = await getHub(token);
      if (!active) return;
      await hub.invoke("JoinHotel", selectedHotelId);

      const handler = (evt: { hotelId: string; roomTypeId: string; date: string; availableRooms: number; price: number }) => {
        if (evt.hotelId !== selectedHotelId) return;
        const dateStr = typeof evt.date === "string" ? evt.date.substring(0, 10) : evt.date;
        qc.setQueryData<InventoryDay[]>(
          ["inventory", selectedHotelId, fromStr, toStr],
          (old) => {
            if (!old) return old;
            const idx = old.findIndex(
              (i) => i.roomTypeId === evt.roomTypeId && i.date.substring(0, 10) === dateStr
            );
            if (idx === -1) return old;
            const next = [...old];
            next[idx] = { ...next[idx], availableRooms: evt.availableRooms, price: evt.price };
            return next;
          }
        );
        pulse(`${evt.roomTypeId}|${dateStr}`);
      };

      hub.on("InventoryUpdated", handler);

      return () => {
        hub.off("InventoryUpdated", handler);
      };
    })();

    return () => {
      active = false;
      getHub(token).then((hub) => {
        hub.invoke("LeaveHotel", selectedHotelId).catch(() => { /* ignore */ });
      }).catch(() => { /* ignore */ });
    };
  }, [selectedHotelId, token, qc, fromStr, toStr]);

  const [editing, setEditing] = useState<{
    roomTypeId: string;
    date: string;
    current?: InventoryDay;
  } | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Inventario</h1>
        <p className="text-sm text-gray-500">
          Disponibilidad diaria por tipo de habitación · próximos {DAYS} días
        </p>
      </div>

      <div className="card p-4">
        <label className="label">Seleccionar hotel</label>
        <input
          className="input"
          placeholder="Buscar hotel por nombre, ciudad o país…"
          value={hotelSearch}
          onChange={(e) => setHotelSearch(e.target.value)}
        />
        {hotelSearch && hotelsPage && (
          <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-auto">
            {hotelsPage.items.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setSelectedHotelId(h.id);
                  setHotelSearch("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
              >
                <div className="font-medium text-gray-800">{h.name}</div>
                <div className="text-xs text-gray-500">{h.city}, {h.country}</div>
              </button>
            ))}
            {hotelsPage.items.length === 0 && (
              <div className="p-3 text-sm text-gray-400">Sin resultados</div>
            )}
          </div>
        )}
        {selectedHotelId && (
          <SelectedHotelBar hotelId={selectedHotelId} onClear={() => setSelectedHotelId(null)} />
        )}
      </div>

      {selectedHotelId && (
        <div className="card overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  <th className="sticky left-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 border-b border-gray-200 min-w-[220px]">
                    Tipo de habitación
                  </th>
                  {dates.map((d) => (
                    <th key={d.toISOString()} className="text-xs font-medium text-gray-500 px-1 py-2 border-b border-gray-200 min-w-[56px]">
                      <div className="leading-tight">{format(d, "EEE", { locale: es })}</div>
                      <div className="text-gray-900 font-semibold">{format(d, "d", { locale: es })}</div>
                      <div className="text-[10px] text-gray-400">{format(d, "MMM", { locale: es })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!roomTypes && (
                  <tr><td colSpan={DAYS + 1} className="text-center text-gray-400 py-8">Cargando…</td></tr>
                )}
                {roomTypes?.length === 0 && (
                  <tr><td colSpan={DAYS + 1} className="text-center text-gray-400 py-8">
                    Este hotel no tiene tipos de habitación definidos
                  </td></tr>
                )}
                {roomTypes?.map((rt) => (
                  <tr key={rt.id}>
                    <td className="sticky left-0 bg-white border-b border-gray-100 px-4 py-2 align-middle">
                      <div className="font-medium text-gray-900 text-sm">{rt.name}</div>
                      <div className="text-xs text-gray-500">
                        Cap. {rt.capacity} · {rt.totalRooms} hab.
                      </div>
                    </td>
                    {dates.map((d) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const key = `${rt.id}|${dateStr}`;
                      const inv = invMap.get(key);
                      const pulseVal = pulseKey[key];
                      return (
                        <td
                          key={key}
                          className="border-b border-gray-100 p-1 align-middle text-center"
                        >
                          <button
                            onClick={() => setEditing({ roomTypeId: rt.id, date: dateStr, current: inv })}
                            className={clsx(
                              "w-full px-1.5 py-2 rounded-md text-xs font-semibold border transition-all",
                              inv ? colorForAvailability(inv.availableRooms)
                                  : "bg-gray-50 text-gray-400 border-gray-200"
                            )}
                            style={pulseVal ? { boxShadow: "0 0 0 2px rgba(233,30,99,0.6)" } : undefined}
                            key={`${key}-${pulseVal || 0}`}
                          >
                            {inv ? inv.availableRooms : "—"}
                            {inv && (
                              <div className="text-[9px] font-normal opacity-70">
                                €{inv.price.toFixed(0)}
                              </div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <LegendBar />
        </div>
      )}

      {editing && selectedHotelId && (
        <EditInventoryModal
          hotelId={selectedHotelId}
          roomTypeId={editing.roomTypeId}
          date={editing.date}
          current={editing.current}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SelectedHotelBar({ hotelId, onClear }: { hotelId: string; onClear: () => void }) {
  const { data } = useQuery({
    queryKey: ["hotel", hotelId],
    queryFn: () => api<Hotel>(`/api/hotels/${hotelId}`),
  });
  if (!data) return null;
  return (
    <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-brand-50 border border-brand-200">
      <div>
        <div className="text-sm font-semibold text-brand-800">{data.name}</div>
        <div className="text-xs text-brand-700">{data.city}, {data.country}</div>
      </div>
      <button className="btn btn-ghost text-xs" onClick={onClear}>Cambiar hotel</button>
    </div>
  );
}

function LegendBar() {
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block" /> &gt;5 disp.
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" /> 1–5 disp.
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> Sin disp.
      </div>
      <div className="ml-auto text-[11px] text-gray-500">
        Clic en una celda para ajustar disponibilidad y precio
      </div>
    </div>
  );
}

function EditInventoryModal({
  hotelId, roomTypeId, date, current, onClose,
}: {
  hotelId: string;
  roomTypeId: string;
  date: string;
  current?: InventoryDay;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [available, setAvailable] = useState(current?.availableRooms ?? 10);
  const [price, setPrice] = useState(current?.price ?? 100);

  const mutation = useMutation({
    mutationFn: async () => {
      return api<InventoryDay>("/api/inventory", {
        method: "POST",
        body: JSON.stringify({ roomTypeId, date, availableRooms: available, price }),
      });
    },
    onSuccess: () => {
      toast.success("Inventario actualizado");
      qc.invalidateQueries({ queryKey: ["inventory", hotelId] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Editar disponibilidad
          </h2>
          <button className="text-gray-400 hover:text-gray-600 text-xl leading-none" onClick={onClose}>×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-xs text-gray-500">
            Fecha: <span className="font-medium text-gray-700">{format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}</span>
          </div>
          <div>
            <label className="label">Habitaciones disponibles</label>
            <input className="input" type="number" min={0} max={10000}
              value={available}
              onChange={(e) => setAvailable(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Precio por noche (€)</label>
            <input className="input" type="number" min={0} step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
