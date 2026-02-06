import React, { useState } from 'react';
import { History, ChevronDown, Clock, FileText, ArrowRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProposalStatusDot } from './ProposalStatusBadge';

/**
 * VersionHistory Component
 *
 * Displays version history of a proposal with ability to view previous versions.
 *
 * @param {Object} props
 * @param {Array} props.versions - Array of version objects
 * @param {number} props.currentVersion - Current active version number
 * @param {Function} props.onVersionSelect - Callback when a version is selected
 * @param {Function} props.onCreateNewVersion - Callback to create new version
 * @param {boolean} props.canCreateVersion - Whether user can create new version
 * @param {string} props.className - Additional CSS classes
 */
export default function VersionHistory({
  versions = [],
  currentVersion = 1,
  onVersionSelect,
  onCreateNewVersion,
  canCreateVersion = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate mock versions if none provided (for demo)
  const displayVersions = versions.length > 0 ? versions : [
    {
      version: currentVersion,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCurrent: true
    }
  ];

  const currentVersionData = displayVersions.find(v => v.version === currentVersion) || displayVersions[0];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Version Dropdown Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${isExpanded
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }
        `}
        aria-expanded={isExpanded}
        aria-haspopup="listbox"
        aria-label="Version history"
      >
        <History className="w-4 h-4" />
        <span className="font-medium text-sm">v{currentVersion}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
              role="listbox"
              aria-label="Select version"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  Version History
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {displayVersions.length} version{displayVersions.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Version List */}
              <div className="max-h-64 overflow-y-auto">
                {displayVersions.map((version, index) => {
                  const isCurrent = version.version === currentVersion;

                  return (
                    <button
                      key={version.version}
                      onClick={() => {
                        onVersionSelect?.(version.version);
                        setIsExpanded(false);
                      }}
                      className={`
                        w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                        ${isCurrent
                          ? 'bg-indigo-50 border-l-2 border-indigo-500'
                          : 'hover:bg-slate-50 border-l-2 border-transparent'
                        }
                      `}
                      role="option"
                      aria-selected={isCurrent}
                    >
                      {/* Version Icon */}
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        ${isCurrent ? 'bg-indigo-100' : 'bg-slate-100'}
                      `}>
                        <FileText className={`w-4 h-4 ${isCurrent ? 'text-indigo-600' : 'text-slate-500'}`} />
                      </div>

                      {/* Version Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isCurrent ? 'text-indigo-700' : 'text-slate-800'}`}>
                            Version {version.version}
                          </span>
                          {isCurrent && (
                            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <ProposalStatusDot status={version.status} />
                          <span className="text-xs text-slate-500">{version.status}</span>
                        </div>

                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(version.updatedAt || version.createdAt)}</span>
                        </div>
                      </div>

                      {/* Arrow for non-current versions */}
                      {!isCurrent && (
                        <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Create New Version Button */}
              {canCreateVersion && (
                <div className="border-t border-slate-100 p-3">
                  <button
                    onClick={() => {
                      onCreateNewVersion?.();
                      setIsExpanded(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Version
                  </button>
                </div>
              )}

              {/* Footer Info */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 text-center">
                  Only published proposals can have new versions
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
