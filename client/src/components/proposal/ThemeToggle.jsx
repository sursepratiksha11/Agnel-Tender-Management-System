import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProposalTheme } from '../../hooks/useProposalTheme';

/**
 * ThemeToggle Component
 *
 * Toggle button for switching between light, dark, and system themes.
 * Only affects proposal pages (isolated theme context).
 *
 * @param {Object} props
 * @param {string} props.variant - Display variant ('icon' | 'button' | 'dropdown')
 * @param {string} props.size - Button size ('sm' | 'md' | 'lg')
 * @param {boolean} props.showLabel - Whether to show text label
 * @param {string} props.className - Additional CSS classes
 */
export default function ThemeToggle({
  variant = 'icon',
  size = 'md',
  showLabel = false,
  className = ''
}) {
  const { mode, theme, isDark, toggleTheme, cycleTheme, setThemeMode } = useProposalTheme();

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getIcon = () => {
    if (mode === 'system') return Monitor;
    if (isDark) return Moon;
    return Sun;
  };

  const Icon = getIcon();

  const getLabel = () => {
    if (mode === 'system') return 'System';
    if (isDark) return 'Dark';
    return 'Light';
  };

  // Simple icon toggle
  if (variant === 'icon') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center rounded-lg transition-colors
          ${isDark
            ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }
          ${className}
        `}
        aria-label={`Toggle theme (current: ${theme})`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon className={iconSizes[size]} />
          </motion.div>
        </AnimatePresence>
      </motion.button>
    );
  }

  // Button with label
  if (variant === 'button') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={cycleTheme}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors
          ${isDark
            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }
          ${className}
        `}
        aria-label={`Change theme (current: ${mode})`}
      >
        <Icon className={iconSizes[size]} />
        {showLabel && <span>{getLabel()}</span>}
      </motion.button>
    );
  }

  // Dropdown with all options
  if (variant === 'dropdown') {
    return (
      <ThemeDropdown
        mode={mode}
        isDark={isDark}
        setThemeMode={setThemeMode}
        size={size}
        className={className}
      />
    );
  }

  return null;
}

/**
 * ThemeDropdown Component
 * Dropdown menu for selecting theme mode
 */
function ThemeDropdown({ mode, isDark, setThemeMode, size, className }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const options = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor }
  ];

  const currentOption = options.find(o => o.id === mode) || options[0];
  const CurrentIcon = currentOption.icon;

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors
          ${isDark
            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <CurrentIcon className={iconSizes[size]} />
        <span>{currentOption.label}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute right-0 mt-2 w-40 rounded-xl shadow-lg border overflow-hidden z-50
                ${isDark
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-white border-slate-200'
                }
              `}
              role="listbox"
            >
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setThemeMode(option.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                    ${mode === option.id
                      ? isDark
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 text-indigo-700'
                      : isDark
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }
                  `}
                  role="option"
                  aria-selected={mode === option.id}
                >
                  <option.icon className={iconSizes[size]} />
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
