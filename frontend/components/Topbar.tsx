"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useLiveStatus } from "@/lib/use-live-status";
import clsx from "clsx";

interface Props {
  onToggleSidebar: () => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Topbar({ onToggleSidebar }: Props) {
  const router = useRouter();
  const { fullName, email, logout } = useAuthStore();
  const { connected } = useLiveStatus();
  const displayName = fullName || email || "";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4">

      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Abrir/cerrar menú"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="1" y1="4" x2="15" y2="4" />
            <line x1="1" y1="8" x2="15" y2="8" />
            <line x1="1" y1="12" x2="15" y2="12" />
          </svg>
        </button>

        <div
          className={clsx(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium",
            connected
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-400 border-gray-200"
          )}
        >
          <span className={clsx(
            "w-1.5 h-1.5 rounded-full",
            connected ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
          )} />
          {connected ? "En vivo" : "Desconectado"}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold text-xs flex items-center justify-center shrink-0 select-none">
            {getInitials(displayName)}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{fullName || "Operador"}</p>
            <p className="text-[11px] text-gray-400 leading-tight">{email}</p>
          </div>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <button
          className="btn btn-ghost text-sm text-gray-500 hover:text-gray-800"
          onClick={() => { logout(); router.push("/login"); }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
          </svg>
          Salir
        </button>
      </div>
    </header>
  );
}
