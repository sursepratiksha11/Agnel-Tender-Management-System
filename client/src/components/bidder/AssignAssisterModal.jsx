/**
 * Assign Assister Modal
 * Allows bidders to search for and assign assisters to proposal sections
 * with permission selection (EDIT or READ_AND_COMMENT)
 */

import { useState, useEffect } from 'react';
import { Search, X, Loader2, AlertCircle, CheckCircle2, Mail, Lock } from 'lucide-react';
import { collaborationService } from '../../services/collaborationService';

export default function AssignAssisterModal({ isOpen, onClose, sectionId, sectionTitle, proposalId, onAssignSuccess }) {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPermission, setSelectedPermission] = useState('READ_AND_COMMENT');
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState('');

  // Reset states when modal is opened
  useEffect(() => {
    if (!isOpen) {
      setSearchEmail('');
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedPermission('READ_AND_COMMENT');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleSearch = async (e) => {
    const email = e.target.value;
    setSearchEmail(email);
    setError('');
    setSuccess('');

    if (email.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await collaborationService.searchAssistersByEmail(email);
      setSearchResults(results);

      if (results.length === 0) {
        setError('No assisters found with that email');
      }
    } catch (err) {
      setError(err.message || 'Failed to search for assisters');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchEmail('');
  };

  const handleAssign = async () => {
    if (!selectedUser) {
      setError('Please select an assister');
      return;
    }

    setAssigning(true);
    setError('');

    try {
      await collaborationService.assignAssisterToSection(
        proposalId,
        sectionId,
        selectedUser.user_id,
        selectedPermission
      );

      setSuccess(`${selectedUser.name} assigned to "${sectionTitle}" with ${selectedPermission === 'EDIT' ? 'Edit' : 'Comment-only'} permission`);

      // Call callback
      if (onAssignSuccess) {
        onAssignSuccess({
          user: selectedUser,
          permission: selectedPermission,
        });
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to assign assister');
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Assign Assister</h2>
            <p className="text-sm text-neutral-500 mt-1">{sectionTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Search Section */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Search Assister by Email
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                placeholder="Enter assister email (min 3 characters)"
                value={searchEmail}
                onChange={handleSearch}
                disabled={!!selectedUser || assigning}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-neutral-600">Searching...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">
                Found {searchResults.length} assister(s)
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map(user => (
                  <button
                    key={user.user_id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full p-3 text-left border border-neutral-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-neutral-900">{user.name}</div>
                    <div className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                    {user.specialty && (
                      <div className="text-xs text-neutral-600 mt-2 px-2 py-1 bg-neutral-100 rounded w-fit">
                        {user.specialty}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-neutral-900">{selectedUser.name}</h3>
                  <p className="text-sm text-neutral-600 flex items-center gap-1 mt-1">
                    <Mail className="w-4 h-4" />
                    {selectedUser.email}
                  </p>
                  {selectedUser.specialty && (
                    <p className="text-sm text-neutral-600 mt-2">
                      <strong>Specialty:</strong> {selectedUser.specialty}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Permission Selection */}
          {selectedUser && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Select Permission Level
              </label>
              <div className="space-y-2">
                {/* EDIT Permission */}
                <label className="flex items-center p-3 border-2 border-neutral-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                  style={{
                    borderColor: selectedPermission === 'EDIT' ? '#3b82f6' : undefined,
                    backgroundColor: selectedPermission === 'EDIT' ? '#eff6ff' : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="permission"
                    value="EDIT"
                    checked={selectedPermission === 'EDIT'}
                    onChange={(e) => setSelectedPermission(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-neutral-900">Can Edit</div>
                    <div className="text-xs text-neutral-600">View, edit, comment, and use AI drafting</div>
                  </div>
                </label>

                {/* READ_AND_COMMENT Permission */}
                <label className="flex items-center p-3 border-2 border-neutral-300 rounded-lg cursor-pointer hover:border-yellow-500 transition-colors"
                  style={{
                    borderColor: selectedPermission === 'READ_AND_COMMENT' ? '#eab308' : undefined,
                    backgroundColor: selectedPermission === 'READ_AND_COMMENT' ? '#fefce8' : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="permission"
                    value="READ_AND_COMMENT"
                    checked={selectedPermission === 'READ_AND_COMMENT'}
                    onChange={(e) => setSelectedPermission(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-neutral-900">Read & Comment Only</div>
                    <div className="text-xs text-neutral-600">View and comment only, no editing or AI drafting</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={assigning}
            className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUser || assigning}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {assigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Assign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
