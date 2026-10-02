'use client';

import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  imageUrl?: string | null;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, imageUrl?: string | null) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, imageUrl) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, imageUrl }] }));
    setTimeout(() => get().dismiss(id), 2500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
