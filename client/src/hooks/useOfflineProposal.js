import { useState, useEffect, useCallback, useRef } from 'react';
import proposalOfflineService from '../services/proposalOfflineService';

/**
 * useOfflineProposal Hook
 *
 * Manages offline storage and sync for proposal drafts.
 * Automatically saves to IndexedDB and syncs when online.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.proposalId - The proposal ID to manage
 * @param {Function} options.onSync - Callback when sync to server is needed
 * @param {boolean} options.autoSync - Whether to auto-sync when online (default: true)
 * @param {number} options.syncInterval - Sync interval in ms (default: 30000)
 *
 * @returns {Object} Offline management utilities
 */
export function useOfflineProposal({
  proposalId,
  onSync,
  autoSync = true,
  syncInterval = 30000
} = {}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [offlineData, setOfflineData] = useState(null);

  const syncCallbackRef = useRef(onSync);
  const syncIntervalRef = useRef(null);

  // Update callback ref
  useEffect(() => {
    syncCallbackRef.current = onSync;
  }, [onSync]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Offline] Back online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[Offline] Gone offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline data on mount
  useEffect(() => {
    if (!proposalId) return;

    const loadOfflineData = async () => {
      const draft = await proposalOfflineService.getDraft(proposalId);
      if (draft) {
        setOfflineData(draft);
        setPendingChanges(draft.synced ? 0 : 1);
      }
    };

    loadOfflineData();
  }, [proposalId]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!autoSync || !isOnline) return;

    // Sync pending changes when coming online
    syncPendingChanges();

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      syncPendingChanges();
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, autoSync, syncInterval]);

  /**
   * Save data to offline storage
   */
  const saveOffline = useCallback(async (data) => {
    if (!proposalId) return;

    try {
      const draft = await proposalOfflineService.saveDraft(proposalId, {
        ...data,
        tenderId: data.tenderId
      });

      setOfflineData(draft);
      setPendingChanges(prev => prev + 1);

      console.log('[Offline] Data saved locally');

      // Try to sync immediately if online
      if (isOnline && autoSync) {
        await syncPendingChanges();
      }

      return draft;
    } catch (error) {
      console.error('[Offline] Failed to save locally:', error);
      throw error;
    }
  }, [proposalId, isOnline, autoSync]);

  /**
   * Sync pending changes to server
   */
  const syncPendingChanges = useCallback(async () => {
    if (!isOnline || isSyncing || !syncCallbackRef.current) return;

    try {
      setIsSyncing(true);

      // Get all unsynced drafts
      const drafts = await proposalOfflineService.getAllDrafts();
      const unsyncedDrafts = drafts.filter(d => !d.synced);

      for (const draft of unsyncedDrafts) {
        try {
          // Call the sync callback (should save to server)
          await syncCallbackRef.current(draft);

          // Mark as synced
          await proposalOfflineService.markSynced(draft.id);

          console.log(`[Offline] Synced draft: ${draft.id}`);
        } catch (error) {
          console.error(`[Offline] Failed to sync draft ${draft.id}:`, error);
        }
      }

      // Process sync queue
      const pendingSync = await proposalOfflineService.getPendingSync();
      for (const item of pendingSync) {
        try {
          // Process based on action type
          if (item.type === 'section_update' && syncCallbackRef.current) {
            await syncCallbackRef.current(item.data);
          }

          await proposalOfflineService.markSyncCompleted(item.id);
        } catch (error) {
          await proposalOfflineService.markSyncFailed(item.id, error.message);
        }
      }

      // Update pending count
      const count = await proposalOfflineService.getUnsyncedCount();
      setPendingChanges(count);
      setLastSynced(new Date());

    } catch (error) {
      console.error('[Offline] Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  /**
   * Queue an action for later sync
   */
  const queueAction = useCallback(async (type, data) => {
    try {
      await proposalOfflineService.queueSync({ type, data });
      setPendingChanges(prev => prev + 1);
    } catch (error) {
      console.error('[Offline] Failed to queue action:', error);
    }
  }, []);

  /**
   * Get offline data
   */
  const getOfflineData = useCallback(async () => {
    if (!proposalId) return null;
    return await proposalOfflineService.getDraft(proposalId);
  }, [proposalId]);

  /**
   * Clear offline data for this proposal
   */
  const clearOfflineData = useCallback(async () => {
    if (!proposalId) return;

    await proposalOfflineService.deleteDraft(proposalId);
    setOfflineData(null);
    setPendingChanges(0);
  }, [proposalId]);

  /**
   * Force sync now
   */
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      console.warn('[Offline] Cannot sync while offline');
      return false;
    }

    await syncPendingChanges();
    return true;
  }, [isOnline, syncPendingChanges]);

  return {
    // State
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    lastSynced,
    pendingChanges,
    hasPendingChanges: pendingChanges > 0,
    offlineData,

    // Actions
    saveOffline,
    getOfflineData,
    clearOfflineData,
    queueAction,
    forceSync,
    syncPendingChanges,

    // Utilities
    isAvailable: proposalOfflineService.isAvailable()
  };
}

export default useOfflineProposal;
