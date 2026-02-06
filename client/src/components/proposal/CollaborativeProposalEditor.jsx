/**
 * Collaborative Proposal Editor
 * Enhanced editor with collaboration features:
 * - Permission-based editing (read-only for insufficient permissions)
 * - AI draft generation
 * - Assigned users display
 * - Last edited info
 * - Comment panel integration
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Edit3,
  Users,
  Clock,
  Sparkles,
  Loader2,
  MessageSquare,
  Lock,
  UserPlus,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useCollaboration } from '../../context/CollaborationContext';
import UserAssignmentModal from './UserAssignmentModal';
import CommentPanel from './CommentPanel';

export default function CollaborativeProposalEditor({
  section,
  content,
  onContentChange,
  onSave,
  proposalId,
  uploadedTenderId, // Added for uploaded tender support
  saving = false,
  lastSaved = null,
}) {
  const {
    isOwner,
    assignments,
    lastEdits,
    canEditSection,
    canCommentSection,
    getSectionPermission,
    generateDraft,
  } = useCollaboration();

  // State
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showInstructionsInput, setShowInstructionsInput] = useState(false);

  const sectionId = section?.section_id || section?._id || section?.id;
  const sectionTitle = section?.title || section?.sectionTitle || section?.name || 'Untitled Section';

  // Permissions
  const canEdit = canEditSection(sectionId);
  const canComment = canCommentSection(sectionId);
  const permission = getSectionPermission(sectionId);

  // Assigned users for this section - use useMemo to stabilize reference
  const sectionAssignees = useMemo(
    () => assignments[sectionId] || [],
    [assignments, sectionId]
  );
  const lastEdit = lastEdits[sectionId];

  // Handle AI draft generation
  const handleGenerateDraft = useCallback(async () => {
    if (!canEdit || generatingDraft) return;

    setGeneratingDraft(true);
    setDraftError(null);

    try {
      const result = await generateDraft(sectionId, customInstructions);

      if (result?.draft) {
        // Confirm before replacing
        if (content && content.trim().length > 50) {
          const confirmed = confirm(
            'This will replace your current content with the AI-generated draft. Continue?'
          );
          if (!confirmed) return;
        }

        onContentChange(result.draft);
        setShowInstructionsInput(false);
        setCustomInstructions('');
      }
    } catch (err) {
      console.error('Draft generation error:', err);
      setDraftError(err.response?.data?.error || 'Failed to generate draft');
    } finally {
      setGeneratingDraft(false);
    }
  }, [sectionId, canEdit, generatingDraft, customInstructions, content, generateDraft, onContentChange]);

  // Handle content change
  const handleContentChange = useCallback((e) => {
    if (!canEdit) return;
    onContentChange(e.target.value);
  }, [canEdit, onContentChange]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                {sectionTitle}
                {section?.is_mandatory && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                    Required
                  </span>
                )}
              </h2>

              {/* Permission badge */}
              <div className="flex items-center gap-3 mt-2">
                {permission === 'OWNER' ? (
                  <span className="flex items-center gap-1 text-xs text-blue-600">
                    <CheckCircle className="w-3 h-3" />
                    Full Access (Owner)
                  </span>
                ) : permission === 'EDIT' ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Edit3 className="w-3 h-3" />
                    Can Edit
                  </span>
                ) : permission === 'READ_AND_COMMENT' ? (
                  <span className="flex items-center gap-1 text-xs text-yellow-600">
                    <MessageSquare className="w-3 h-3" />
                    View & Comment
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Lock className="w-3 h-3" />
                    Read Only
                  </span>
                )}

                {/* Last edited info */}
                {lastEdit && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    Last edited by {lastEdit.user_name}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Assigned users badges */}
              {sectionAssignees.length > 0 && (
                <div className="flex items-center gap-1 mr-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <div className="flex -space-x-2">
                    {sectionAssignees.slice(0, 3).map((user) => (
                      <div
                        key={user.user_id}
                        className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                        title={`${user.name} (${user.permission === 'EDIT' ? 'Can Edit' : 'Can Comment'})`}
                      >
                        <span className="text-xs font-medium text-blue-700">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {sectionAssignees.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-medium text-slate-600">
                          +{sectionAssignees.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manage assignments button (owner only) */}
              {isOwner && (
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign
                </button>
              )}

              {/* Toggle comments */}
              <button
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  showComments
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Comments
              </button>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {/* AI Draft Section (only for edit permission) */}
          {canEdit && (
            <div className="mb-4">
              {showInstructionsInput ? (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Custom Instructions (Optional)
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g., Focus on technical specifications, keep it concise..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                      onClick={() => {
                        setShowInstructionsInput(false);
                        setCustomInstructions('');
                      }}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateDraft}
                      disabled={generatingDraft}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {generatingDraft ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Draft
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowInstructionsInput(true)}
                  disabled={generatingDraft}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white font-medium rounded-lg transition-all shadow-sm"
                >
                  {generatingDraft ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating AI Draft...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Draft
                    </>
                  )}
                </button>
              )}

              {/* Draft error */}
              {draftError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <span className="text-sm text-red-700">{draftError}</span>
                </div>
              )}
            </div>
          )}

          {/* Read-only notice */}
          {!canEdit && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {permission === 'READ_AND_COMMENT'
                  ? 'You have comment-only access. Use the comment panel to provide feedback.'
                  : 'You have read-only access to this section.'}
              </span>
            </div>
          )}

          {/* Text Editor */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <textarea
              value={content || ''}
              onChange={handleContentChange}
              placeholder={
                canEdit
                  ? 'Start typing your response...'
                  : 'No content yet'
              }
              disabled={!canEdit}
              className={`w-full min-h-[400px] p-4 text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg ${
                !canEdit ? 'bg-slate-50 cursor-not-allowed' : ''
              }`}
              style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.6' }}
            />
          </div>

          {/* Save status */}
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-slate-500">
              {content ? `${content.split(/\s+/).filter(w => w).length} words` : '0 words'}
            </span>
            <span className="text-slate-500">
              {saving ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Saved
                </span>
              ) : null}
            </span>
          </div>

          {/* Section requirements (if available) */}
          {(section?.content || section?.description) && (
            <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <ChevronRight className="w-4 h-4" />
                Section Requirements
              </h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {section.content || section.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comments Panel (collapsible) */}
      {showComments && (
        <CommentPanel
          sectionId={sectionId}
          sectionTitle={sectionTitle}
          className="w-80 flex-shrink-0"
        />
      )}

      {/* Assignment Modal */}
      <UserAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        sectionId={sectionId}
        sectionTitle={sectionTitle}
      />
    </div>
  );
}
