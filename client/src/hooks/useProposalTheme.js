import { useProposalTheme as useThemeContext } from '../context/ProposalThemeContext';

/**
 * useProposalTheme Hook
 *
 * Re-export of the context hook for convenience.
 * Provides access to theme state and controls for proposal pages.
 *
 * @example
 * const { theme, isDark, toggleTheme } = useProposalTheme();
 *
 * @returns {Object} Theme context value
 * @property {string} mode - Current mode setting ('light' | 'dark' | 'system')
 * @property {string} theme - Effective theme ('light' | 'dark')
 * @property {boolean} isDark - Whether dark theme is active
 * @property {boolean} isLight - Whether light theme is active
 * @property {boolean} isSystem - Whether using system preference
 * @property {Function} setThemeMode - Set specific mode
 * @property {Function} toggleTheme - Toggle between light/dark
 * @property {Function} cycleTheme - Cycle through all modes
 * @property {Array} availableModes - List of available modes
 */
export function useProposalTheme() {
  return useThemeContext();
}

export default useProposalTheme;
