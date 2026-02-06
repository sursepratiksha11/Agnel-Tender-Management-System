import { useCallback, useRef } from 'react';

/**
 * useA11yAnnounce Hook
 *
 * Provides screen reader announcements for important actions.
 * Creates an invisible live region that screen readers can detect.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.politeness - ARIA live politeness ('polite' | 'assertive')
 *
 * @returns {Object} Announcement utilities
 *
 * @example
 * const { announce } = useA11yAnnounce();
 *
 * // Announce a status message
 * announce('Proposal saved successfully');
 *
 * // Announce with assertive priority (interrupts)
 * announce('Error: Failed to save', 'assertive');
 */
export function useA11yAnnounce({ politeness = 'polite' } = {}) {
  const announcerRef = useRef(null);
  const timeoutRef = useRef(null);

  /**
   * Get or create the announcer element
   */
  const getAnnouncer = useCallback(() => {
    if (announcerRef.current) {
      return announcerRef.current;
    }

    // Check if an announcer already exists in the DOM
    const existingAnnouncer = document.getElementById('proposal-a11y-announcer');
    if (existingAnnouncer) {
      announcerRef.current = existingAnnouncer;
      return existingAnnouncer;
    }

    // Create new announcer element
    const announcer = document.createElement('div');
    announcer.id = 'proposal-a11y-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', politeness);
    announcer.setAttribute('aria-atomic', 'true');

    // Visually hidden but accessible to screen readers
    Object.assign(announcer.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });

    document.body.appendChild(announcer);
    announcerRef.current = announcer;

    return announcer;
  }, [politeness]);

  /**
   * Announce a message to screen readers
   *
   * @param {string} message - The message to announce
   * @param {string} priority - Optional priority override ('polite' | 'assertive')
   */
  const announce = useCallback((message, priority = politeness) => {
    if (!message) return;

    const announcer = getAnnouncer();

    // Update aria-live if priority differs
    if (priority !== announcer.getAttribute('aria-live')) {
      announcer.setAttribute('aria-live', priority);
    }

    // Clear any pending announcements
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear current content first (helps trigger re-announcement)
    announcer.textContent = '';

    // Set new content after a brief delay
    timeoutRef.current = setTimeout(() => {
      announcer.textContent = message;

      // Clear after 5 seconds to allow re-announcement of same message
      timeoutRef.current = setTimeout(() => {
        announcer.textContent = '';
      }, 5000);
    }, 100);
  }, [getAnnouncer, politeness]);

  /**
   * Announce multiple messages in sequence
   *
   * @param {Array<string>} messages - Array of messages to announce
   * @param {number} delay - Delay between messages in ms (default: 1000)
   */
  const announceSequence = useCallback((messages, delay = 1000) => {
    messages.forEach((message, index) => {
      setTimeout(() => {
        announce(message);
      }, index * delay);
    });
  }, [announce]);

  /**
   * Clear any pending announcements
   */
  const clearAnnouncements = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (announcerRef.current) {
      announcerRef.current.textContent = '';
    }
  }, []);

  /**
   * Cleanup function (call on unmount if needed)
   */
  const cleanup = useCallback(() => {
    clearAnnouncements();
    // Don't remove the DOM element as it might be shared
  }, [clearAnnouncements]);

  return {
    announce,
    announceSequence,
    clearAnnouncements,
    cleanup,
    // Pre-built announcement helpers
    announceSuccess: (message) => announce(message || 'Action completed successfully', 'polite'),
    announceError: (message) => announce(message || 'An error occurred', 'assertive'),
    announceLoading: (message) => announce(message || 'Loading...', 'polite'),
    announceSaved: () => announce('Changes saved successfully', 'polite'),
    announcePublished: () => announce('Proposal published successfully', 'polite')
  };
}

export default useA11yAnnounce;
