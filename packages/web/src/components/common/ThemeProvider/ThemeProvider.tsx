/**
 * Theme Provider Module
 * Handles dark/light mode, color schemes, and responsive themes
 * Uses Context API for global theme state management
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Type definitions for theme configuration
export type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset';
export type ThemeMode = 'light' | 'dark' | 'highContrast';

interface ThemeContextType {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  toggleMode: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

interface ThemeConfig {
  mode: ThemeMode;
  scheme: ColorScheme;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
}

// Theme context with default values
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Custom hook for using theme
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

/**
 * Theme configuration factory
 * Generates color palettes based on mode and scheme
 */
const getThemeConfig = (mode: ThemeMode, scheme: ColorScheme): ThemeConfig => {
  // Color scheme definitions
  const schemes: Record<ColorScheme, { light: any; dark: any }> = {
    default: {
      light: { primary: '#1976d2', secondary: '#dc004e', background: '#f5f5f5' },
      dark: { primary: '#90caf9', secondary: '#f48fb1', background: '#121212' }
    },
    ocean: {
      light: { primary: '#006064', secondary: '#00838f', background: '#e0f7fa' },
      dark: { primary: '#80deea', secondary: '#4dd0e1', background: '#0d1b2a' }
    },
    forest: {
      light: { primary: '#2e7d32', secondary: '#43a047', background: '#e8f5e9' },
      dark: { primary: '#81c784', secondary: '#a5d6a7', background: '#1b2a1b' }
    },
    sunset: {
      light: { primary: '#e65100', secondary: '#f57c00', background: '#fff3e0' },
      dark: { primary: '#ffab91', secondary: '#ff8a65', background: '#2d1b1b' }
    }
  };

  const selectedScheme = schemes[scheme];
  const colors = mode === 'dark' ? selectedScheme.dark : selectedScheme.light;
  const isDark = mode === 'dark' || mode === 'highContrast';

  return {
    mode,
    scheme,
    primary: colors.primary,
    secondary: colors.secondary,
    background: isDark ? '#121212' : colors.background,
    surface: isDark ? '#1e1e1e' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000'
  };
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  defaultScheme?: ColorScheme;
}

/**
 * Main Theme Provider Component
 * Wraps application with theme context and MUI theme
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light',
  defaultScheme = 'default'
}) => {
  // State management with localStorage persistence
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) || defaultMode;
  });

  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem('color-scheme');
    return (stored as ColorScheme) || defaultScheme;
  });

  // Toggle between light/dark modes
  const toggleMode = () => {
    setMode(prev => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', newMode);
      return newMode;
    });
  };

  // Update color scheme
  const handleSetColorScheme = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    localStorage.setItem('color-scheme', scheme);
  };

  // Generate theme configuration
  const themeConfig = getThemeConfig(mode, colorScheme);

  // Create MUI theme
  const muiTheme = createTheme({
    palette: {
      mode: mode === 'highContrast' ? 'light' : mode,
      primary: { main: themeConfig.primary },
      secondary: { main: themeConfig.secondary },
      background: { default: themeConfig.background, paper: themeConfig.surface },
      text: { primary: themeConfig.text }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 700 },
      h2: { fontSize: '2rem', fontWeight: 600 },
      body1: { fontSize: '1rem', lineHeight: 1.5 }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8
          }
        }
      }
    }
  });

  // Effect for high contrast mode accessibility
  useEffect(() => {
    if (mode === 'highContrast') {
      document.documentElement.style.filter = 'contrast(1.5)';
    } else {
      document.documentElement.style.filter = 'none';
    }
  }, [mode]);

  const value = {
    mode,
    colorScheme,
    toggleMode,
    setColorScheme: handleSetColorScheme
  };

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};