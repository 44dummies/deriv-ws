import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  
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


export const useTradingStore = useAppStore;
