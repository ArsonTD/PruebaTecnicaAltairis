"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Hotel, RoomType } from "@/lib/types";
import { StarsBadge } from "@/components/Badge";
import Modal from "@/components/Modal";
import { useState } from "react";
import { toast } from "sonner";

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: hotel, isLoading } = useQuery({
    queryKey: ["hotel", id],
    queryFn: () => api<Hotel>(`/api/hotels/${id}`),
  });

  const { data: roomTypes, isLoading: rtLoading } = useQuery({
    queryKey: ["roomtypes", id],
    queryFn: () => api<RoomType[]>(`/api/roomtypes?hotelId=${id}`),
  });

  const [open, setOpen] = useState(false);

  if (isLoading) return <div className="text-gray-400">Cargando hotel…</div>;
  if (!hotel) return <div className="text-gray-400">Hotel no encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/hoteles" className="hover:text-brand-600">Hoteles</Link>
        <span>/</span>
        <span className="text-gray-700">{hotel.name}</span>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{hotel.name}</h1>
              <StarsBadge stars={hotel.stars} />
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {hotel.address} · {hotel.city}, {hotel.country}
            </div>
            <div className="mt-3 flex gap-2">
              <span className="badge bg-gray-100 text-gray-700">{hotel.category}</span>
              {hotel.isActive ? (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">Activo</span>
              ) : (
                <span className="badge bg-gray-100 text-gray-500">Inactivo</span>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-500">Contacto</div>
            <div className="text-gray-800">{hotel.email}</div>
            <div className="text-gray-600">{hotel.phone}</div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tipos de habitación</h2>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Añadir tipo</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th className="w-24">Capacidad</th>
              <th className="w-28">Precio base</th>
              <th className="w-28">Habitaciones</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {rtLoading && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-10">Cargando…</td></tr>
            )}
            {!rtLoading && roomTypes?.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-10">Aún no hay tipos definidos</td></tr>
            )}
            {roomTypes?.map((rt) => (
              <tr key={rt.id}>
                <td className="font-medium text-gray-900">{rt.name}</td>
                <td>{rt.capacity}</td>
                <td>€{rt.basePrice.toFixed(2)}</td>
                <td>{rt.totalRooms}</td>
                <td className="text-gray-600 text-xs">{rt.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateRoomTypeModal hotelId={id} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateRoomTypeModal({
  hotelId, open, onClose,
}: { hotelId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", capacity: 2, basePrice: 100, description: "", totalRooms: 10 });

  const mutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api("/api/roomtypes", { method: "POST", body: JSON.stringify({ hotelId, ...payload }) }),
    onSuccess: () => {
      toast.success("Tipo de habitación creado");
      qc.invalidateQueries({ queryKey: ["roomtypes", hotelId] });
      qc.invalidateQueries({ queryKey: ["hotel", hotelId] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nuevo tipo de habitación">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Capacidad</label>
            <input className="input" type="number" min={1} max={20} required
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Precio base (€)</label>
            <input className="input" type="number" min={0} step="0.01" required
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Habitaciones</label>
            <input className="input" type="number" min={1} max={10000} required
              value={form.totalRooms}
              onChange={(e) => setForm({ ...form, totalRooms: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea className="input" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Creando…" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
