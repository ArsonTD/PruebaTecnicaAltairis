"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const nav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
        <path d="M2 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V4zM2 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3zM11 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V4zM11 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z" />
      </svg>
    ),
  },
  {
    href: "/hoteles",
    label: "Hoteles",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12H4V4zm2 2h2v2H6V6zm0 4h2v2H6v-2zm4-4h2v2h-2V6zm0 4h2v2h-2v-2zm-2 4h4v2H8v-2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/inventario",
    label: "Inventario",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8zm2 2h2v2H6v-2zm4 0h2v2h-2v-2zm4 0h-2v2h2v-2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/mantenimiento",
    label: "Mantenimiento",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/reservas",
    label: "Reservas",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={clsx(
          "shrink-0 flex flex-col bg-white border-r border-gray-200",
          "transition-all duration-300 ease-in-out overflow-hidden",
          open ? "w-60" : "w-0"
        )}
      >
        <div className="w-60 flex flex-col flex-1 min-h-0">

          {/* Logo */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-100">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12H4V4zm2 2h2v2H6V6zm0 4h2v2H6v-2zm4-4h2v2h-2V6zm0 4h2v2h-2v-2zm-2 4h4v2H8v-2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight tracking-tight">Altairis</p>
              <p className="text-[10px] text-gray-400 leading-tight uppercase tracking-wider">Backoffice</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    "transition-all duration-150 whitespace-nowrap",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <span className={clsx(
                    "shrink-0 transition-colors",
                    active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600"
                  )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-300 uppercase tracking-wider whitespace-nowrap">
              MVP · Viajes Altairis
            </p>
          </div>

        </div>
      </aside>
    </>
  );
}
