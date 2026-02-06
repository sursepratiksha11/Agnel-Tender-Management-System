/**
 * Proposal Offline Service
 *
 * IndexedDB-based offline storage for proposal drafts.
 * Automatically syncs when back online.
 *
 * Uses the 'idb' library for a Promise-based IndexedDB API.
 */

import { openDB } from 'idb';

const DB_NAME = 'tenderflow_proposals';
const DB_VERSION = 1;
const STORE_DRAFTS = 'draft_proposals';
const STORE_SYNC_QUEUE = 'sync_queue';

/**
 * Initialize the IndexedDB database
 */
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create drafts store
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        const draftsStore = db.createObjectStore(STORE_DRAFTS, {
          keyPath: 'id'
        });
        draftsStore.createIndex('tenderId', 'tenderId', { unique: false });
        draftsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORE_SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }
    }
  });
}

/**
 * Proposal Offline Service
 */
export const proposalOfflineService = {
  /**
   * Save a proposal draft to IndexedDB
   *
   * @param {string} proposalId - The proposal ID
   * @param {Object} data - Draft data to save
   * @returns {Promise<void>}
   */
  saveDraft: async (proposalId, data) => {
    try {
      const db = await initDB();

      const draft = {
        id: proposalId,
        ...data,
        updatedAt: new Date().toISOString(),
        synced: false
      };

      await db.put(STORE_DRAFTS, draft);

      console.log(`[Offline] Draft saved: ${proposalId}`);

      return draft;
    } catch (error) {
      console.error('[Offline] Failed to save draft:', error);
      throw error;
    }
  },

  /**
   * Get a proposal draft from IndexedDB
   *
   * @param {string} proposalId - The proposal ID
   * @returns {Promise<Object|null>}
   */
  getDraft: async (proposalId) => {
    try {
      const db = await initDB();
      const draft = await db.get(STORE_DRAFTS, proposalId);

      return draft || null;
    } catch (error) {
      console.error('[Offline] Failed to get draft:', error);
      return null;
    }
  },

  /**
   * Get all drafts for a tender
   *
   * @param {string} tenderId - The tender ID
   * @returns {Promise<Array>}
   */
  getDraftsByTender: async (tenderId) => {
    try {
      const db = await initDB();
      const drafts = await db.getAllFromIndex(STORE_DRAFTS, 'tenderId', tenderId);

      return drafts;
    } catch (error) {
      console.error('[Offline] Failed to get drafts by tender:', error);
      return [];
    }
  },

  /**
   * Get all stored drafts
   *
   * @returns {Promise<Array>}
   */
  getAllDrafts: async () => {
    try {
      const db = await initDB();
      const drafts = await db.getAll(STORE_DRAFTS);

      // Sort by updatedAt descending
      return drafts.sort((a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } catch (error) {
      console.error('[Offline] Failed to get all drafts:', error);
      return [];
    }
  },

  /**
   * Delete a draft from IndexedDB
   *
   * @param {string} proposalId - The proposal ID
   * @returns {Promise<void>}
   */
  deleteDraft: async (proposalId) => {
    try {
      const db = await initDB();
      await db.delete(STORE_DRAFTS, proposalId);

      console.log(`[Offline] Draft deleted: ${proposalId}`);
    } catch (error) {
      console.error('[Offline] Failed to delete draft:', error);
      throw error;
    }
  },

  /**
   * Mark a draft as synced
   *
   * @param {string} proposalId - The proposal ID
   * @returns {Promise<void>}
   */
  markSynced: async (proposalId) => {
    try {
      const db = await initDB();
      const draft = await db.get(STORE_DRAFTS, proposalId);

      if (draft) {
        draft.synced = true;
        draft.syncedAt = new Date().toISOString();
        await db.put(STORE_DRAFTS, draft);
      }
    } catch (error) {
      console.error('[Offline] Failed to mark synced:', error);
    }
  },

  /**
   * Add an action to the sync queue
   *
   * @param {Object} action - Action to queue
   * @returns {Promise<number>} - Queue item ID
   */
  queueSync: async (action) => {
    try {
      const db = await initDB();

      const queueItem = {
        ...action,
        createdAt: new Date().toISOString(),
        status: 'pending',
        attempts: 0
      };

      const id = await db.add(STORE_SYNC_QUEUE, queueItem);

      console.log(`[Offline] Action queued: ${action.type}`);

      return id;
    } catch (error) {
      console.error('[Offline] Failed to queue sync:', error);
      throw error;
    }
  },

  /**
   * Get pending sync actions
   *
   * @returns {Promise<Array>}
   */
  getPendingSync: async () => {
    try {
      const db = await initDB();
      const items = await db.getAllFromIndex(STORE_SYNC_QUEUE, 'status', 'pending');

      return items.sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );
    } catch (error) {
      console.error('[Offline] Failed to get pending sync:', error);
      return [];
    }
  },

  /**
   * Mark a sync queue item as completed
   *
   * @param {number} id - Queue item ID
   * @returns {Promise<void>}
   */
  markSyncCompleted: async (id) => {
    try {
      const db = await initDB();
      await db.delete(STORE_SYNC_QUEUE, id);
    } catch (error) {
      console.error('[Offline] Failed to mark sync completed:', error);
    }
  },

  /**
   * Mark a sync queue item as failed
   *
   * @param {number} id - Queue item ID
   * @param {string} error - Error message
   * @returns {Promise<void>}
   */
  markSyncFailed: async (id, error) => {
    try {
      const db = await initDB();
      const item = await db.get(STORE_SYNC_QUEUE, id);

      if (item) {
        item.status = 'failed';
        item.error = error;
        item.attempts += 1;
        item.lastAttemptAt = new Date().toISOString();
        await db.put(STORE_SYNC_QUEUE, item);
      }
    } catch (error) {
      console.error('[Offline] Failed to mark sync failed:', error);
    }
  },

  /**
   * Get unsynced drafts count
   *
   * @returns {Promise<number>}
   */
  getUnsyncedCount: async () => {
    try {
      const db = await initDB();
      const drafts = await db.getAll(STORE_DRAFTS);

      return drafts.filter(d => !d.synced).length;
    } catch (error) {
      console.error('[Offline] Failed to get unsynced count:', error);
      return 0;
    }
  },

  /**
   * Clear all offline data
   *
   * @returns {Promise<void>}
   */
  clearAll: async () => {
    try {
      const db = await initDB();
      await db.clear(STORE_DRAFTS);
      await db.clear(STORE_SYNC_QUEUE);

      console.log('[Offline] All data cleared');
    } catch (error) {
      console.error('[Offline] Failed to clear data:', error);
      throw error;
    }
  },

  /**
   * Check if IndexedDB is available
   *
   * @returns {boolean}
   */
  isAvailable: () => {
    return typeof indexedDB !== 'undefined';
  }
};

export default proposalOfflineService;
