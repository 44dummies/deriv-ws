import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'app-store',
    }
  )
);

// Keep old export for compatibility
export const useTradingStore = useAppStore;
