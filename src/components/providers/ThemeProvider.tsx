'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Waves, CloudRain, Mountain, Crown } from 'lucide-react';

type Theme = 'aegean' | 'karadeniz' | 'gobeklitepe';

interface ThemeConfig {
  id: Theme;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ThemeProviderContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: ThemeConfig[];
}

const ThemeProviderContext = createContext<ThemeProviderContext | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'aegean' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  const availableThemes = [
    {
      id: 'aegean' as Theme,
      name: 'Aegean',
      description: 'Mediterranean civilizations and coastal heritage',
      icon: Waves
    },
    {
      id: 'karadeniz' as Theme,
      name: 'Karadeniz',
      description: 'Black Sea forests and Pontic mountains',
      icon: CloudRain
    },
    {
      id: 'gobeklitepe' as Theme,
      name: 'Göbekli Tepe',
      description: 'World\'s oldest temple and Neolithic mysticism',
      icon: Mountain
    }
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('omnix-theme') as Theme;
    if (savedTheme && availableThemes.find(t => t.id === savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('aegean', 'karadeniz', 'gobeklitepe', 'light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('omnix-theme', theme);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    availableThemes
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export type { ThemeConfig }; 