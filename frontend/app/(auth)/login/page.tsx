"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AuthResponse } from "@/lib/types";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("admin@altairis.com");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(res.token, res.email, res.fullName, res.expiresAt);
      toast.success(`Bienvenido, ${res.fullName}`);
      router.push("/dashboard");
    } catch (err) {
      toast.error((err as Error).message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-50 via-white to-gray-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-xl">A</div>
            <h1 className="text-2xl font-bold text-gray-900">Altairis</h1>
          </div>
          <p className="text-gray-500 mt-2 text-sm">Backoffice operativo</p>
        </div>

        <form onSubmit={onSubmit} className="card p-8 space-y-5">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Accediendo..." : "Iniciar sesión"}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Credenciales de demo ya cargadas
          </p>
        </form>
      </div>
    </main>
  );
}
