import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    secondary: string;
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors = {
  primary: '#e0c724',
  secondary: '#4f46e5',
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

const darkColors = {
  primary: '#e0c724',
  secondary: '#818cf8',
  background: '#0f0f0f',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#374151',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme || 'light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}