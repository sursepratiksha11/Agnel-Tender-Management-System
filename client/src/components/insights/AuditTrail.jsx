/**
 * Audit Trail Component
 * Displays audit logs for a proposal with timeline view
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Edit,
  Send,
  FileDown,
  Eye,
  Trash2,
  MessageSquare,
  CheckCircle,
  UserPlus,
  FileCheck,
  Upload,
  Sparkles,
  RotateCcw,
  Loader,
  AlertCircle,
  ChevronDown,
  Filter
} from 'lucide-react';
import { insightsService } from '../../services/bidder/insightsService';

// Action icon and color mapping
const actionConfig = {
  CREATE: { icon: FileCheck, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Created' },
  EDIT: { icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Edited' },
  SUBMIT: { icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Submitted' },
  EXPORT: { icon: FileDown, color: 'text-indigo-600', bgColor: 'bg-indigo-100', label: 'Exported' },
  VIEW: { icon: Eye, color: 'text-slate-600', bgColor: 'bg-slate-100', label: 'Viewed' },
  DELETE: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Deleted' },
  AI_DRAFT: { icon: Sparkles, color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'AI Draft' },
  AI_ANALYZE: { icon: Sparkles, color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'AI Analysis' },
  COMMENT_ADD: { icon: MessageSquare, color: 'text-cyan-600', bgColor: 'bg-cyan-100', label: 'Comment' },
  COMMENT_RESOLVE: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Resolved' },
  ASSIGN_COLLABORATOR: { icon: UserPlus, color: 'text-violet-600', bgColor: 'bg-violet-100', label: 'Assigned' },
  FINALIZE: { icon: FileCheck, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Finalized' },
  PUBLISH: { icon: Upload, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Published' },
  REVERT: { icon: RotateCcw, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Reverted' }
};

const defaultConfig = { icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-100', label: 'Action' };

export default function AuditTrail({ proposalId, compact = false, maxItems = 10 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [showAll, setShowAll] = useState(false);
  const [filterAction, setFilterAction] = useState(null);

  const fetchLogs = async () => {
    if (!proposalId) return;

    try {
      setLoading(true);
      const response = await insightsService.getProposalAuditLogs(proposalId, {
        limit: showAll ? 100 : maxItems,
        offset: 0,
        actions: filterAction ? [filterAction] : null
      });

      setLogs(response.data.logs);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      console.error('[AuditTrail] Error:', err);
      setError('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [proposalId, showAll, filterAction]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-center py-4">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-600">Loading audit trail...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-2">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Get unique action types for filter
  const actionTypes = [...new Set(logs.map(l => l.action))];

  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Audit Trail</h3>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {pagination.total} entries
          </span>
        </div>

        {/* Filter dropdown */}
        {!compact && actionTypes.length > 1 && (
          <div className="relative">
            <select
              value={filterAction || ''}
              onChange={(e) => setFilterAction(e.target.value || null)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white appearance-none pr-8 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>
                  {actionConfig[action]?.label || action}
                </option>
              ))}
            </select>
            <Filter className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Timeline */}
      {logs.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />

          <div className="space-y-4">
            {logs.map((log, index) => {
              const config = actionConfig[log.action] || defaultConfig;
              const IconComponent = config.icon;

              return (
                <div key={log.id} className="relative flex items-start gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className={`relative z-10 p-1.5 rounded-full ${config.bgColor} border-2 border-white shadow-sm`}>
                    <IconComponent className={`w-3 h-3 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {log.formattedTime}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 mt-0.5">
                      <span className="font-medium">{log.userName}</span>
                      {' '}{log.description}
                    </p>

                    {/* Details (if any) */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-1 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 inline-block">
                        {log.details.sectionTitle && (
                          <span>Section: {log.details.sectionTitle}</span>
                        )}
                        {log.details.format && (
                          <span>Format: {log.details.format.toUpperCase()}</span>
                        )}
                        {log.details.newStatus && (
                          <span>Status: {log.details.newStatus}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No activity recorded yet</p>
        </div>
      )}

      {/* Show more button */}
      {!showAll && pagination.total > maxItems && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-1"
        >
          <ChevronDown className="w-4 h-4" />
          Show all {pagination.total} entries
        </button>
      )}

      {showAll && pagination.total > maxItems && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full mt-4 py-2 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
        >
          Show less
        </button>
      )}
    </div>
  );
}
