import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * OfflineIndicator Component
 *
 * Displays the current online/offline status and sync state.
 *
 * @param {Object} props
 * @param {boolean} props.isOnline - Whether device is online
 * @param {boolean} props.isSyncing - Whether sync is in progress
 * @param {number} props.pendingChanges - Number of pending changes to sync
 * @param {Date} props.lastSynced - Last successful sync time
 * @param {Function} props.onSyncClick - Callback when sync button is clicked
 * @param {string} props.variant - Display variant ('minimal' | 'compact' | 'full')
 * @param {string} props.className - Additional CSS classes
 */
export default function OfflineIndicator({
  isOnline = true,
  isSyncing = false,
  pendingChanges = 0,
  lastSynced = null,
  onSyncClick,
  variant = 'compact',
  className = ''
}) {
  const formatLastSynced = (date) => {
    if (!date) return 'Never';

    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  // Minimal: Just an icon
  if (variant === 'minimal') {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        title={isOnline ? 'Online' : 'Offline'}
        role="status"
        aria-label={isOnline ? 'Online' : 'Offline'}
      >
        <AnimatePresence mode="wait">
          {isOnline ? (
            <motion.div
              key="online"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {isSyncing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                </motion.div>
              ) : pendingChanges > 0 ? (
                <Cloud className="w-4 h-4 text-amber-500" />
              ) : (
                <Check className="w-4 h-4 text-emerald-500" />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="offline"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <WifiOff className="w-4 h-4 text-slate-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Compact: Icon with status text
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        role="status"
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          {!isOnline ? (
            <motion.div
              key="offline"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full"
            >
              <WifiOff className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Offline</span>
            </motion.div>
          ) : isSyncing ? (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4 text-blue-500" />
              </motion.div>
              <span className="text-sm font-medium text-blue-600">Syncing...</span>
            </motion.div>
          ) : pendingChanges > 0 ? (
            <motion.button
              key="pending"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={onSyncClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-full transition-colors"
            >
              <Cloud className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">
                {pendingChanges} unsaved
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="synced"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">Saved</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full: Complete status panel
  return (
    <div
      className={`p-4 rounded-xl border ${className} ${
        isOnline
          ? 'bg-white border-slate-200'
          : 'bg-slate-50 border-slate-300'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-4 h-4 text-emerald-600" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
              <WifiOff className="w-4 h-4 text-slate-500" />
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-800">
              {isOnline ? 'Online' : 'Offline'}
            </p>
            <p className="text-xs text-slate-500">
              {isOnline ? 'Changes sync automatically' : 'Changes saved locally'}
            </p>
          </div>
        </div>

        {/* Sync Button */}
        {isOnline && pendingChanges > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSyncClick}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            Sync Now
          </motion.button>
        )}
      </div>

      {/* Status Details */}
      <div className="space-y-2">
        {/* Pending Changes */}
        {pendingChanges > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-slate-600">
              {pendingChanges} change{pendingChanges !== 1 ? 's' : ''} pending
            </span>
          </div>
        )}

        {/* Last Synced */}
        {lastSynced && (
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">
              Last synced: {formatLastSynced(lastSynced)}
            </span>
          </div>
        )}

        {/* Offline Message */}
        {!isOnline && (
          <div className="mt-3 p-3 bg-slate-100 rounded-lg">
            <p className="text-sm text-slate-600">
              Your changes are being saved locally. They'll sync automatically when you're back online.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * OfflineBanner Component
 *
 * Full-width banner for offline notification
 */
export function OfflineBanner({ isOnline, pendingChanges = 0 }) {
  if (isOnline && pendingChanges === 0) return null;

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-slate-800 text-white overflow-hidden"
        >
          <div className="px-4 py-2 flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              You're offline. Changes are saved locally.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
