import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ActiveSymbol, OpenContract, Tick } from '../services/websocketService';

interface UserInfo {
  balance: number;
  currency: string;
  email: string;
  fullname: string;
  loginid: string;
  is_virtual: number;
}

interface TradingStore {
  // User
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo | null) => void;
  
  // Balance
  balance: number;
  currency: string;
  setBalance: (balance: number, currency: string) => void;
  
  // Markets
  activeSymbols: ActiveSymbol[];
  setActiveSymbols: (symbols: ActiveSymbol[]) => void;
  selectedSymbol: ActiveSymbol | null;
  setSelectedSymbol: (symbol: ActiveSymbol | null) => void;
  
  // Favorites
  favorites: string[];
  toggleFavorite: (symbol: string) => void;
  
  // Ticks
  currentTick: Tick | null;
  setCurrentTick: (tick: Tick | null) => void;
  tickHistory: { time: number; value: number }[];
  setTickHistory: (history: { time: number; value: number }[]) => void;
  
  // Open Contracts
  openContracts: OpenContract[];
  setOpenContracts: (contracts: OpenContract[]) => void;
  addOpenContract: (contract: OpenContract) => void;
  updateOpenContract: (contract: OpenContract) => void;
  removeOpenContract: (contractId: number) => void;
  
  // UI State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  activeTab: 'chart' | 'positions' | 'history';
  setActiveTab: (tab: 'chart' | 'positions' | 'history') => void;
  
  // Settings
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  defaultStake: number;
  setDefaultStake: (stake: number) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // User
      userInfo: null,
      setUserInfo: (info) => set({ userInfo: info }),
      
      // Balance
      balance: 0,
      currency: 'USD',
      setBalance: (balance, currency) => set({ balance, currency }),
      
      // Markets
      activeSymbols: [],
      setActiveSymbols: (symbols) => set({ activeSymbols: symbols }),
      selectedSymbol: null,
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      
      // Favorites
      favorites: [],
      toggleFavorite: (symbol) => {
        const favorites = get().favorites;
        if (favorites.includes(symbol)) {
          set({ favorites: favorites.filter(s => s !== symbol) });
        } else {
          set({ favorites: [...favorites, symbol] });
        }
      },
      
      // Ticks
      currentTick: null,
      setCurrentTick: (tick) => set({ currentTick: tick }),
      tickHistory: [],
      setTickHistory: (history) => set({ tickHistory: history }),
      
      // Open Contracts
      openContracts: [],
      setOpenContracts: (contracts) => set({ openContracts: contracts }),
      addOpenContract: (contract) => set({ openContracts: [...get().openContracts, contract] }),
      updateOpenContract: (contract) => set({
        openContracts: get().openContracts.map(c => 
          c.contract_id === contract.contract_id ? contract : c
        ),
      }),
      removeOpenContract: (contractId) => set({
        openContracts: get().openContracts.filter(c => c.contract_id !== contractId),
      }),
      
      // UI State
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      activeTab: 'chart',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Settings
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      defaultStake: 10,
      setDefaultStake: (stake) => set({ defaultStake: stake }),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => set({
        notifications: [
          ...get().notifications,
          {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
          },
        ],
      }),
      removeNotification: (id) => set({
        notifications: get().notifications.filter(n => n.id !== id),
      }),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'trading-store',
      partialize: (state) => ({
        favorites: state.favorites,
        theme: state.theme,
        defaultStake: state.defaultStake,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
