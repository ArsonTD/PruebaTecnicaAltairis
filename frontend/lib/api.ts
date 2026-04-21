import { useAuthStore } from "@/store/auth";

const API_URL =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL_SERVER ||
       process.env.NEXT_PUBLIC_API_URL ||
       "http://backend:8080")
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

export function getApiUrl() {
  return API_URL;
}

export async function api<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.message || body.title || JSON.stringify(body);
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
