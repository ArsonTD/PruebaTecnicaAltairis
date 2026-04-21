"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuthStore } from "@/store/auth";
import { getHub, stopHub } from "@/lib/signalr";
import { useLiveStatus } from "@/lib/use-live-status";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token } = useAuthStore();
  const setConnected = useLiveStatus((s) => s.setConnected);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const hub = await getHub(token);
        if (cancelled) return;
        setConnected(true);

        hub.onclose(() => setConnected(false));
        hub.onreconnected(() => setConnected(true));
        hub.onreconnecting(() => setConnected(false));

        hub.on("ReservationCreated", (evt: { code: string; hotelId: string }) => {
          toast.success(`Nueva reserva ${evt.code}`);
        });
      } catch (e) {
        console.error("SignalR connect failed", e);
        setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      stopHub();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
