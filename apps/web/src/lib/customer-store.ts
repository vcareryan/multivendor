'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomerSession {
  token: string;
  customer: { id: string; name?: string | null; phone: string; email?: string | null };
}

interface CustomerState {
  session: CustomerSession | null;
  setSession: (s: CustomerSession) => void;
  logout: () => void;
}

/** Storefront customer session (phone-OTP login), persisted per browser. */
export const useCustomer = create<CustomerState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s }),
      logout: () => set({ session: null }),
    }),
    { name: 'utanstore-customer' },
  ),
);
