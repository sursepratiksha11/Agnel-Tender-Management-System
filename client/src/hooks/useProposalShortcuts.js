import { useEffect, useCallback, useRef } from 'react';

/**
 * useProposalShortcuts Hook
 *
 * Keyboard shortcuts for proposal workspace.
 * Only active when the component using this hook is mounted.
 *
 * Shortcuts:
 * - Ctrl+E: Export proposal
 * - Ctrl+Shift+P: Publish proposal
 * - Ctrl+S: Save draft
 * - Ctrl+Shift+F: Toggle fullscreen
 * - ?: Show shortcuts help
 * - Escape: Close modals
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onExport - Callback for export shortcut
 * @param {Function} options.onPublish - Callback for publish shortcut
 * @param {Function} options.onSave - Callback for save shortcut
 * @param {Function} options.onToggleFullscreen - Callback for fullscreen toggle
 * @param {Function} options.onShowHelp - Callback to show shortcuts help
 * @param {Function} options.onEscape - Callback for escape key
 * @param {boolean} options.enabled - Whether shortcuts are enabled (default: true)
 *
 * @returns {Object} Shortcut utilities
 */
export function useProposalShortcuts({
  onExport,
  onPublish,
  onSave,
  onToggleFullscreen,
  onShowHelp,
  onEscape,
  enabled = true
} = {}) {
  const callbacksRef = useRef({
    onExport,
    onPublish,
    onSave,
    onToggleFullscreen,
    onShowHelp,
    onEscape
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onExport,
      onPublish,
      onSave,
      onToggleFullscreen,
      onShowHelp,
      onEscape
    };
  }, [onExport, onPublish, onSave, onToggleFullscreen, onShowHelp, onEscape]);

  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target;
    const isInputElement =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    // Allow Escape and Ctrl+S even in inputs
    const isEscape = event.key === 'Escape';
    const isSave = event.ctrlKey && event.key === 's';

    if (isInputElement && !isEscape && !isSave) {
      return;
    }

    const { onExport, onPublish, onSave, onToggleFullscreen, onShowHelp, onEscape } =
      callbacksRef.current;

    // Ctrl+E: Export
    if (event.ctrlKey && !event.shiftKey && event.key === 'e') {
      event.preventDefault();
      onExport?.();
      return;
    }

    // Ctrl+Shift+P: Publish (using Shift to avoid browser print dialog)
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      onPublish?.();
      return;
    }

    // Ctrl+S: Save
    if (event.ctrlKey && !event.shiftKey && event.key === 's') {
      event.preventDefault();
      onSave?.();
      return;
    }

    // Ctrl+Shift+F: Toggle fullscreen
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      event.preventDefault();
      onToggleFullscreen?.();
      return;
    }

    // ?: Show help (Shift+/)
    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      onShowHelp?.();
      return;
    }

    // Escape: Close
    if (event.key === 'Escape') {
      onEscape?.();
      return;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Return utilities
  return {
    /**
     * List of available shortcuts for display
     */
    shortcuts: [
      {
        key: 'Ctrl+E',
        description: 'Export proposal',
        action: 'export'
      },
      {
        key: 'Ctrl+Shift+P',
        description: 'Publish proposal',
        action: 'publish'
      },
      {
        key: 'Ctrl+S',
        description: 'Save draft',
        action: 'save'
      },
      {
        key: 'Ctrl+Shift+F',
        description: 'Toggle fullscreen',
        action: 'fullscreen'
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        action: 'help'
      },
      {
        key: 'Esc',
        description: 'Close modal/panel',
        action: 'escape'
      }
    ],

    /**
     * Trigger a shortcut programmatically
     */
    triggerShortcut: (action) => {
      const callbacks = callbacksRef.current;
      switch (action) {
        case 'export':
          callbacks.onExport?.();
          break;
        case 'publish':
          callbacks.onPublish?.();
          break;
        case 'save':
          callbacks.onSave?.();
          break;
        case 'fullscreen':
          callbacks.onToggleFullscreen?.();
          break;
        case 'help':
          callbacks.onShowHelp?.();
          break;
        case 'escape':
          callbacks.onEscape?.();
          break;
        default:
          console.warn(`Unknown shortcut action: ${action}`);
      }
    }
  };
}

export default useProposalShortcuts;
