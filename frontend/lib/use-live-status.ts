"use client";

import { create } from "zustand";

interface LiveStatus {
  connected: boolean;
  setConnected: (v: boolean) => void;
}

export const useLiveStatus = create<LiveStatus>((set) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),
}));
