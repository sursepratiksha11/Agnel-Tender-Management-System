/**
 * User Assignment Modal
 * Allows proposal owners to assign users to sections
 *
 * IMPORTANT: Does NOT show internal role names
 * Only shows: user name, email, and permission type
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, Trash2, Check, Users, Edit3, MessageSquare } from 'lucide-react';
import { useCollaboration } from '../../context/CollaborationContext';
import { collaborationService } from '../../services/bidder/collaborationService';

export default function UserAssignmentModal({
  isOpen,
  onClose,
  sectionId,
  sectionTitle = 'Section',
}) {
  const { assignments, assignUser, removeAssignment, isOwner } = useCollaboration();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState('EDIT');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState(null);

  // Current assignees for this section - use useMemo to stabilize reference
  const sectionAssignees = React.useMemo(
    () => assignments[sectionId] || [],
    [assignments, sectionId]
  );

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await collaborationService.searchUsers(searchQuery);
        // Filter out already assigned users
        const assignedIds = sectionAssignees.map(a => a.user_id);
        const filtered = results.filter(u => !assignedIds.includes(u.user_id));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, sectionAssignees]);

  // Handle assign user
  const handleAssign = useCallback(async (userId) => {
    setAssigning(true);
    setError(null);
    try {
      await assignUser(sectionId, userId, selectedPermission);
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to assign user';
      // Friendlier guidance for missing uploaded tender id
      if (msg.includes('uploadedTenderId is required')) {
        setError('Please save this uploaded tender first before assigning users. Go to Proposal tab and save, or re-run analysis to let it auto-save.');
      } else {
        setError(msg);
      }
    } finally {
      setAssigning(false);
    }
  }, [sectionId, selectedPermission, assignUser]);

  // Handle remove user
  const handleRemove = useCallback(async (userId) => {
    setRemoving(userId);
    setError(null);
    try {
      await removeAssignment(sectionId, userId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove user');
    } finally {
      setRemoving(null);
    }
  }, [sectionId, removeAssignment]);

  // Handle update permission
  const handleUpdatePermission = useCallback(async (userId, newPermission) => {
    try {
      await assignUser(sectionId, userId, newPermission);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update permission');
    }
  }, [sectionId, assignUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Manage Assignments</h2>
            <p className="text-sm text-slate-500 mt-0.5">{sectionTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Search */}
          {isOwner && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Add User by Email
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email (min 3 characters)..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Permission selector */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm text-slate-600">Permission:</span>
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EDIT">Can Edit</option>
                  <option value="READ_AND_COMMENT">Can Comment</option>
                </select>
              </div>

              {/* Search results */}
              {searchQuery.length >= 3 && (
                <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                  {searching ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No users found
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {searchResults.map((user) => (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between p-3 hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                          <button
                            onClick={() => handleAssign(user.user_id)}
                            disabled={assigning}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Current Assignees */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Users ({sectionAssignees.length})
            </h3>

            {sectionAssignees.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500 text-sm">
                No users assigned to this section
              </div>
            ) : (
              <div className="space-y-2">
                {sectionAssignees.map((assignee) => (
                  <div
                    key={assignee.user_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-700 font-medium text-sm">
                          {assignee.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>

                      {/* Info */}
                      <div>
                        <p className="font-medium text-slate-900">{assignee.name}</p>
                        <p className="text-sm text-slate-500">{assignee.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Permission badge */}
                      {isOwner ? (
                        <select
                          value={assignee.permission}
                          onChange={(e) => handleUpdatePermission(assignee.user_id, e.target.value)}
                          className="px-2 py-1 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="EDIT">Can Edit</option>
                          <option value="READ_AND_COMMENT">Can Comment</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          assignee.permission === 'EDIT'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {assignee.permission === 'EDIT' ? (
                            <>
                              <Edit3 className="w-3 h-3" />
                              Can Edit
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3" />
                              Can Comment
                            </>
                          )}
                        </span>
                      )}

                      {/* Remove button */}
                      {isOwner && (
                        <button
                          onClick={() => handleRemove(assignee.user_id)}
                          disabled={removing === assignee.user_id}
                          className="p-1.5 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove assignment"
                        >
                          {removing === assignee.user_id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permission Legend */}
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="font-medium text-slate-700 mb-2">Permission Levels:</p>
            <div className="space-y-1 text-slate-600">
              <p className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-green-600" />
                <span><strong>Can Edit:</strong> Modify content + use AI drafting</span>
              </p>
              <p className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-yellow-600" />
                <span><strong>Can Comment:</strong> View + add comments only</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
