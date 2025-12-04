import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = {
  dark: {
    name: 'Dark',
    primary: '#6366f1',
    primaryRgb: '99, 102, 241',
    bg: '#0a0a0f',
    bgSecondary: '#111118',
    bgChat: '#17171f',
    msgOwn: '#6366f1',
    msgOther: '#1e1e2d',
    accent: '#22d3ee',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  midnight: {
    name: 'Midnight Blue',
    primary: '#3b82f6',
    primaryRgb: '59, 130, 246',
    bg: '#0c1222',
    bgSecondary: '#131d33',
    bgChat: '#182338',
    msgOwn: '#3b82f6',
    msgOther: '#1e293b',
    accent: '#60a5fa',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  emerald: {
    name: 'Emerald',
    primary: '#10b981',
    primaryRgb: '16, 185, 129',
    bg: '#0a0f0d',
    bgSecondary: '#0f1a15',
    bgChat: '#132117',
    msgOwn: '#10b981',
    msgOther: '#1a2e23',
    accent: '#34d399',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  rose: {
    name: 'Rose',
    primary: '#f43f5e',
    primaryRgb: '244, 63, 94',
    bg: '#0f0a0b',
    bgSecondary: '#1a1012',
    bgChat: '#211418',
    msgOwn: '#e11d48',
    msgOther: '#2d1a1f',
    accent: '#fb7185',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  telegram: {
    name: 'Telegram',
    primary: '#3390ec',
    primaryRgb: '51, 144, 236',
    bg: '#0e1621',
    bgSecondary: '#17212b',
    bgChat: '#0e1621',
    msgOwn: '#2b5278',
    msgOther: '#182533',
    accent: '#6ab2f2',
    text: '#ffffff',
    textSecondary: '#8b9ba5',
    textMuted: '#6c7883',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  whatsapp: {
    name: 'WhatsApp',
    primary: '#00a884',
    primaryRgb: '0, 168, 132',
    bg: '#0b141a',
    bgSecondary: '#111b21',
    bgChat: '#0b141a',
    msgOwn: '#005c4b',
    msgOther: '#202c33',
    accent: '#25d366',
    text: '#e9edef',
    textSecondary: '#8696a0',
    textMuted: '#667781',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  discord: {
    name: 'Discord',
    primary: '#5865f2',
    primaryRgb: '88, 101, 242',
    bg: '#1e1f22',
    bgSecondary: '#2b2d31',
    bgChat: '#313338',
    msgOwn: '#5865f2',
    msgOther: '#383a40',
    accent: '#5865f2',
    text: '#f2f3f5',
    textSecondary: '#b5bac1',
    textMuted: '#949ba4',
    border: 'rgba(255, 255, 255, 0.06)',
  },
  light: {
    name: 'Light',
    primary: '#3b82f6',
    primaryRgb: '59, 130, 246',
    bg: '#ffffff',
    bgSecondary: '#f3f4f6',
    bgChat: '#e5e7eb',
    msgOwn: '#3b82f6',
    msgOther: '#ffffff',
    accent: '#2563eb',
    text: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    border: 'rgba(0, 0, 0, 0.1)',
  },
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('tradermind_theme') || 'telegram';
  });

  const theme = THEMES[themeId] || THEMES.telegram;

  const applyTheme = (id) => {
    const selectedTheme = THEMES[id] || THEMES.telegram;
    const root = document.documentElement;
    
    root.style.setProperty('--theme-primary', selectedTheme.primary);
    root.style.setProperty('--theme-primary-rgb', selectedTheme.primaryRgb);
    root.style.setProperty('--theme-bg', selectedTheme.bg);
    root.style.setProperty('--theme-bg-secondary', selectedTheme.bgSecondary);
    root.style.setProperty('--theme-bg-chat', selectedTheme.bgChat);
    root.style.setProperty('--theme-msg-own', selectedTheme.msgOwn);
    root.style.setProperty('--theme-msg-other', selectedTheme.msgOther);
    root.style.setProperty('--theme-accent', selectedTheme.accent);
    root.style.setProperty('--theme-text', selectedTheme.text);
    root.style.setProperty('--theme-text-secondary', selectedTheme.textSecondary);
    root.style.setProperty('--theme-text-muted', selectedTheme.textMuted);
    root.style.setProperty('--theme-border', selectedTheme.border);
    
    document.body.style.backgroundColor = selectedTheme.bg;
    document.body.style.color = selectedTheme.text;
    
    localStorage.setItem('tradermind_theme', id);
  };

  const setTheme = (id) => {
    setThemeId(id);
    applyTheme(id);
  };

  useEffect(() => {
    applyTheme(themeId);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export { THEMES };
export default ThemeContext;
