import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';

/**
 * A11yAnnouncer Component
 *
 * Screen reader live region for announcing status messages.
 * Visually hidden but accessible to assistive technology.
 *
 * @param {Object} props
 * @param {string} props.politeness - ARIA live politeness ('polite' | 'assertive')
 * @param {string} props.message - Optional initial message
 * @param {number} props.clearDelay - Delay in ms before clearing message (default: 5000)
 *
 * @example
 * // Using with ref
 * const announcerRef = useRef();
 * announcerRef.current?.announce('Saved!');
 *
 * // Using with message prop
 * <A11yAnnouncer message={statusMessage} />
 */
const A11yAnnouncer = forwardRef(function A11yAnnouncer(
  { politeness = 'polite', message: propMessage, clearDelay = 5000 },
  ref
) {
  const [message, setMessage] = useState('');
  const [currentPoliteness, setCurrentPoliteness] = useState(politeness);

  // Handle prop-based messages
  useEffect(() => {
    if (propMessage) {
      setMessage(propMessage);

      // Clear after delay
      const timer = setTimeout(() => {
        setMessage('');
      }, clearDelay);

      return () => clearTimeout(timer);
    }
  }, [propMessage, clearDelay]);

  // Expose announce method via ref
  useImperativeHandle(ref, () => ({
    /**
     * Announce a message
     * @param {string} msg - Message to announce
     * @param {string} priority - Priority ('polite' | 'assertive')
     */
    announce: (msg, priority = 'polite') => {
      // Clear first to trigger re-announcement
      setMessage('');
      setCurrentPoliteness(priority);

      // Set new message after brief delay
      requestAnimationFrame(() => {
        setMessage(msg);

        // Clear after delay
        setTimeout(() => {
          setMessage('');
        }, clearDelay);
      });
    },

    /**
     * Clear current announcement
     */
    clear: () => {
      setMessage('');
    }
  }), [clearDelay]);

  return (
    <div
      role="status"
      aria-live={currentPoliteness}
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0
      }}
    >
      {message}
    </div>
  );
});

export default A11yAnnouncer;

/**
 * VisuallyHidden Component
 *
 * Utility component for hiding content visually while keeping it
 * accessible to screen readers.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to hide visually
 * @param {string} props.as - HTML element to render (default: 'span')
 */
export function VisuallyHidden({ children, as: Component = 'span', ...props }) {
  return (
    <Component
      {...props}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        ...props.style
      }}
    >
      {children}
    </Component>
  );
}

/**
 * SkipLink Component
 *
 * Skip navigation link for keyboard users.
 * Becomes visible on focus.
 *
 * @param {Object} props
 * @param {string} props.href - Target element ID (e.g., "#main-content")
 * @param {React.ReactNode} props.children - Link text
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="
        sr-only focus:not-sr-only
        focus:absolute focus:top-4 focus:left-4 focus:z-50
        focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white
        focus:rounded-lg focus:shadow-lg focus:outline-none
        focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
      "
    >
      {children}
    </a>
  );
}

/**
 * FocusTrap Component
 *
 * Traps focus within the component for modal dialogs.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to trap focus within
 * @param {boolean} props.active - Whether focus trap is active
 */
export function FocusTrap({ children, active = true }) {
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}
