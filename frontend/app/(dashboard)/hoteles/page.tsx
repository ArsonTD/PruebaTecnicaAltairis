"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Hotel, HotelCategory, Paged } from "@/lib/types";
import { StarsBadge } from "@/components/Badge";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import { toast } from "sonner";

const CATEGORIES: HotelCategory[] = ["Business", "Resort", "Boutique", "City"];

function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function HotelesPage() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("");
  const [category, setCategory] = useState<HotelCategory | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, country, category]);

  const queryKey = useMemo(
    () => ["hotels", { search: debouncedSearch, country, category, page, pageSize }],
    [debouncedSearch, country, category, page, pageSize]
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (country) params.set("country", country);
      if (category) params.set("category", category);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return api<Paged<Hotel>>(`/api/hotels?${params}`);
    },
  });

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: () => api<string[]>("/api/hotels/countries"),
    staleTime: 5 * 60_000,
  });

  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Hoteles</h1>
          <p className="text-sm text-gray-500">
            Catálogo maestro — {data ? data.total.toLocaleString("es") : "…"} registros
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          + Nuevo hotel
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Buscar</label>
          <input
            className="input"
            placeholder="Nombre, ciudad o país..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <label className="label">País</label>
          <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Todos</option>
            {countries?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <label className="label">Categoría</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as HotelCategory | "")}
          >
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Hotel</th>
              <th>País / Ciudad</th>
              <th>Categoría</th>
              <th className="w-24">Estrellas</th>
              <th className="w-28">Habitaciones</th>
              <th className="w-24">Estado</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-10">Cargando…</td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-10">
                  Sin resultados
                </td>
              </tr>
            )}
            {data?.items.map((h) => (
              <tr key={h.id}>
                <td>
                  <Link href={`/hoteles/${h.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                    {h.name}
                  </Link>
                  <div className="text-xs text-gray-500">{h.email}</div>
                </td>
                <td>
                  <div className="font-medium text-gray-700">{h.city}</div>
                  <div className="text-xs text-gray-500">{h.country}</div>
                </td>
                <td>
                  <span className="badge bg-gray-100 text-gray-700">{h.category}</span>
                </td>
                <td><StarsBadge stars={h.stars} /></td>
                <td className="text-gray-700">{h.roomTypesCount}</td>
                <td>
                  {h.isActive ? (
                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">Activo</span>
                  ) : (
                    <span className="badge bg-gray-100 text-gray-500">Inactivo</span>
                  )}
                </td>
                <td>
                  <Link href={`/hoteles/${h.id}`} className="text-brand-500 hover:underline text-sm">→</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          page={page}
          totalPages={data?.totalPages ?? 1}
          total={data?.total ?? 0}
          label="hoteles"
          isFetching={isFetching}
          onPageChange={setPage}
        />
      </div>

      <CreateHotelModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateHotelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    country: "España",
    city: "",
    address: "",
    stars: 4,
    category: "Business" as HotelCategory,
    email: "",
    phone: "",
  });

  const mutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api("/api/hotels", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Hotel creado");
      qc.invalidateQueries({ queryKey: ["hotels"] });
      qc.invalidateQueries({ queryKey: ["countries"] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nuevo hotel">
      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
        className="space-y-4"
      >
        <div>
          <label className="label">Nombre</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">País</label>
            <input className="input" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input className="input" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Dirección</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as HotelCategory })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Estrellas</label>
            <select className="input" value={form.stars} onChange={(e) => setForm({ ...form, stars: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Creando…" : "Crear hotel"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
