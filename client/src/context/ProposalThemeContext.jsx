import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ProposalThemeContext
 *
 * Isolated theme context for proposal pages only.
 * Does not affect other parts of the application.
 *
 * Supports: 'light' | 'dark' | 'system'
 */

const STORAGE_KEY = 'proposal_theme';
const THEME_MODES = ['light', 'dark', 'system'];

const ProposalThemeContext = createContext(null);

/**
 * Get the effective theme based on mode and system preference
 *
 * @param {string} mode - 'light' | 'dark' | 'system'
 * @returns {string} - 'light' | 'dark'
 */
function getEffectiveTheme(mode) {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

/**
 * ProposalThemeProvider Component
 *
 * Wrap proposal pages with this provider to enable theme switching.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.defaultMode - Default theme mode ('light' | 'dark' | 'system')
 */
export function ProposalThemeProvider({ children, defaultMode = 'light' }) {
  // Initialize mode from localStorage or default
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && THEME_MODES.includes(stored)) {
        return stored;
      }
    } catch (e) {
      console.warn('[ProposalTheme] Failed to read from localStorage:', e);
    }
    return defaultMode;
  });

  // Computed effective theme
  const [theme, setTheme] = useState(() => getEffectiveTheme(mode));

  // Update effective theme when mode changes
  useEffect(() => {
    setTheme(getEffectiveTheme(mode));
  }, [mode]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  // Persist mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.warn('[ProposalTheme] Failed to save to localStorage:', e);
    }
  }, [mode]);

  // Set theme mode
  const setThemeMode = useCallback((newMode) => {
    if (THEME_MODES.includes(newMode)) {
      setMode(newMode);
    } else {
      console.warn(`[ProposalTheme] Invalid theme mode: ${newMode}`);
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setMode((currentMode) => {
      if (currentMode === 'light') return 'dark';
      if (currentMode === 'dark') return 'light';
      // If system, toggle to opposite of current effective theme
      return theme === 'light' ? 'dark' : 'light';
    });
  }, [theme]);

  // Cycle through all modes
  const cycleTheme = useCallback(() => {
    setMode((currentMode) => {
      const currentIndex = THEME_MODES.indexOf(currentMode);
      const nextIndex = (currentIndex + 1) % THEME_MODES.length;
      return THEME_MODES[nextIndex];
    });
  }, []);

  const value = {
    // Current mode setting ('light' | 'dark' | 'system')
    mode,
    // Effective theme ('light' | 'dark')
    theme,
    // Is dark theme active
    isDark: theme === 'dark',
    // Is light theme active
    isLight: theme === 'light',
    // Is using system preference
    isSystem: mode === 'system',
    // Set specific mode
    setThemeMode,
    // Toggle between light/dark
    toggleTheme,
    // Cycle through all modes
    cycleTheme,
    // Available modes
    availableModes: THEME_MODES
  };

  return (
    <ProposalThemeContext.Provider value={value}>
      <div
        className={`proposal-theme-root ${theme === 'dark' ? 'proposal-dark' : 'proposal-light'}`}
        data-proposal-theme={theme}
      >
        {children}
      </div>
    </ProposalThemeContext.Provider>
  );
}

/**
 * useProposalTheme Hook
 *
 * Access the proposal theme context.
 *
 * @returns {Object} Theme context value
 * @throws {Error} If used outside of ProposalThemeProvider
 */
export function useProposalTheme() {
  const context = useContext(ProposalThemeContext);

  if (!context) {
    throw new Error('useProposalTheme must be used within a ProposalThemeProvider');
  }

  return context;
}

export default ProposalThemeContext;
