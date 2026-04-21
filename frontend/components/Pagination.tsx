interface Props {
  page: number;
  totalPages: number;
  total: number;
  label?: string;
  isFetching?: boolean;
  onPageChange: (p: number) => void;
}

function getPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1, 2];

  if (current > 4) pages.push("…");

  const start = Math.max(3, current - 1);
  const end = Math.min(total - 2, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 3) pages.push("…");

  pages.push(total - 1, total);

  return pages;
}

export default function Pagination({ page, totalPages, total, label = "registros", isFetching, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = getPages(page, totalPages);
  const from = (page - 1) * Math.ceil(total / totalPages) + 1;
  const to = Math.min(page * Math.ceil(total / totalPages), total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 select-none">
      <p className="text-xs text-gray-500">
        {from}–{to} de {total.toLocaleString("es")} {label}
        {isFetching && <span className="ml-2 text-brand-500">actualizando…</span>}
      </p>

      <div className="flex items-center gap-1">
        <button
          className="pagination-btn"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          ‹
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`pagination-btn ${p === page ? "pagination-btn-active" : ""}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          ›
        </button>

        <span className="ml-3 text-xs text-gray-400">Ir a</span>
        <select
          className="ml-1 text-xs px-2 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700
                     focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
          value={page}
          onChange={(e) => onPageChange(Number(e.target.value))}
          aria-label="Ir a página"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>Pág. {p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
