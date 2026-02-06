import React, { useEffect, useRef } from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ShortcutsHelpModal Component
 *
 * Modal displaying available keyboard shortcuts for the proposal workspace.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback to close modal
 * @param {Array} props.shortcuts - Array of shortcut objects (optional, uses defaults)
 */
export default function ShortcutsHelpModal({
  isOpen,
  onClose,
  shortcuts: customShortcuts
}) {
  const modalRef = useRef(null);

  // Default shortcuts if none provided
  const defaultShortcuts = [
    {
      category: 'General',
      items: [
        { key: 'Ctrl+S', description: 'Save current section' },
        { key: 'Ctrl+E', description: 'Export proposal' },
        { key: 'Ctrl+Shift+P', description: 'Publish proposal' },
        { key: '?', description: 'Show this help' },
        { key: 'Esc', description: 'Close modal/panel' }
      ]
    },
    {
      category: 'Navigation',
      items: [
        { key: 'Ctrl+Shift+F', description: 'Toggle fullscreen mode' },
        { key: 'Tab', description: 'Move to next element' },
        { key: 'Shift+Tab', description: 'Move to previous element' }
      ]
    },
    {
      category: 'Editor',
      items: [
        { key: 'Ctrl+Z', description: 'Undo' },
        { key: 'Ctrl+Shift+Z', description: 'Redo' },
        { key: 'Ctrl+A', description: 'Select all text' }
      ]
    }
  ];

  const shortcuts = customShortcuts || defaultShortcuts;

  // Focus management and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="shortcuts-modal-title" className="text-lg font-bold text-white">
                  Keyboard Shortcuts
                </h2>
                <p className="text-indigo-100 text-sm">
                  Speed up your workflow
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {shortcuts.map((category, categoryIndex) => {
              const items = Array.isArray(category?.items) ? category.items : [];
              const title = category?.category || `Category ${categoryIndex + 1}`;

              return (
              <div key={title} className={categoryIndex > 0 ? 'mt-6' : ''}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  {title}
                </h3>
                <div className="space-y-2">
                  {items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm text-slate-700">
                        {shortcut.description}
                      </span>
                      <KeyCombo keys={shortcut.key} />
                    </div>
                  ))}
                </div>
              </div>
            );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
              <Command className="w-3 h-3" />
              Press <KeyCombo keys="?" size="sm" /> anytime to show shortcuts
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * KeyCombo Component
 * Renders a keyboard key combination with visual styling
 */
function KeyCombo({ keys, size = 'md' }) {
  const keyParts = keys.split('+').map(k => k.trim());

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs'
  };

  return (
    <div className="flex items-center gap-1">
      {keyParts.map((key, index) => (
        <React.Fragment key={index}>
          <kbd
            className={`
              ${sizeClasses[size]}
              bg-slate-100 border border-slate-300 rounded
              font-mono font-medium text-slate-700
              shadow-sm
            `}
          >
            {formatKey(key)}
          </kbd>
          {index < keyParts.length - 1 && (
            <span className="text-slate-400 text-xs">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Format key name for display
 */
function formatKey(key) {
  const isMac = typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const keyMap = {
    Ctrl: isMac ? '⌘' : 'Ctrl',
    Alt: isMac ? '⌥' : 'Alt',
    Shift: isMac ? '⇧' : 'Shift',
    Enter: '↵',
    Esc: 'Esc',
    Tab: '⇥',
    Backspace: '⌫',
    Delete: '⌦',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→'
  };

  return keyMap[key] || key;
}
