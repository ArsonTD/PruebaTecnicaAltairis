"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  email: string | null;
  fullName: string | null;
  expiresAt: string | null;
  setSession: (token: string, email: string, fullName: string, expiresAt: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      fullName: null,
      expiresAt: null,
      setSession: (token, email, fullName, expiresAt) =>
        set({ token, email, fullName, expiresAt }),
      logout: () => set({ token: null, email: null, fullName: null, expiresAt: null }),
    }),
    {
      name: "altairis-auth",
    }
  )
);
