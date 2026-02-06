/**
 * Comment Panel
 * Displays threaded comments for a proposal section
 * Supports: create, reply, edit, delete, resolve
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Reply,
  Trash2,
  Check,
  X,
  MoreVertical,
  Edit2,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useCollaboration } from '../../context/CollaborationContext';

export default function CommentPanel({
  sectionId,
  sectionTitle = 'Section',
  className = '',
}) {
  const {
    comments,
    loadComments,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,
    canCommentSection,
    isOwner,
  } = useCollaboration();

  // State
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Stabilize array reference to prevent re-render loops
  const sectionComments = useMemo(
    () => comments[sectionId] || [],
    [comments, sectionId]
  );
  const canComment = canCommentSection(sectionId);

  // Load comments on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await loadComments(sectionId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sectionId, loadComments]);

  // Handle submit new comment
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await addComment(sectionId, newComment.trim());
      setNewComment('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }, [sectionId, newComment, submitting, addComment]);

  // Refresh comments
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadComments(sectionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sectionId, loadComments]);

  return (
    <div className={`flex flex-col bg-white border-l border-slate-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-500" />
          <h3 className="font-medium text-slate-900">Comments</h3>
          {sectionComments.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
              {countTotalComments(sectionComments)}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh comments"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-slate-500 text-sm py-8">
            Loading comments...
          </div>
        ) : sectionComments.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No comments yet</p>
            {canComment && (
              <p className="text-xs mt-1">Be the first to comment</p>
            )}
          </div>
        ) : (
          sectionComments.map((comment) => (
            <CommentThread
              key={comment.comment_id}
              comment={comment}
              sectionId={sectionId}
              isOwner={isOwner}
              canComment={canComment}
              onReply={addComment}
              onUpdate={updateComment}
              onDelete={deleteComment}
              onResolve={resolveComment}
              onUnresolve={unresolveComment}
            />
          ))
        )}
      </div>

      {/* New comment input */}
      {canComment && (
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200">
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="self-end px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ==========================================
// Comment Thread Component
// ==========================================

function CommentThread({
  comment,
  sectionId,
  isOwner,
  canComment,
  onReply,
  onUpdate,
  onDelete,
  onResolve,
  onUnresolve,
  depth = 0,
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check if current user is author (simplified - would need user context in real app)
  const isAuthor = false; // In real app: currentUser.id === comment.user_id

  // Handle reply submit
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply) return;

    setSubmittingReply(true);
    try {
      await onReply(sectionId, replyText.trim(), comment.comment_id);
      setReplyText('');
      setShowReply(false);
    } catch (err) {
      console.error('Reply error:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Handle edit submit
  const handleEditSubmit = async () => {
    if (!editText.trim()) return;
    try {
      await onUpdate(comment.comment_id, editText.trim());
      setEditing(false);
    } catch (err) {
      console.error('Edit error:', err);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    setDeleting(true);
    try {
      await onDelete(comment.comment_id, sectionId);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Handle resolve
  const handleToggleResolve = async () => {
    try {
      if (comment.is_resolved) {
        await onUnresolve(comment.comment_id, sectionId);
      } else {
        await onResolve(comment.comment_id, sectionId);
      }
    } catch (err) {
      console.error('Resolve error:', err);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-3 border-l-2 border-slate-100' : ''}`}>
      {/* Comment */}
      <div className={`p-3 rounded-lg ${comment.is_resolved ? 'bg-green-50' : 'bg-slate-50'}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-medium text-xs">
                {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>

            <div>
              <span className="font-medium text-slate-900 text-sm">
                {comment.user?.name || 'Unknown'}
              </span>
              <span className="text-slate-400 text-xs ml-2">
                {formatTime(comment.created_at)}
              </span>
            </div>

            {/* Resolved badge */}
            {comment.is_resolved && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                <CheckCircle className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>

          {/* Actions menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                  {(isAuthor || isOwner) && (
                    <button
                      onClick={() => { setEditing(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-sm text-slate-700"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => { handleToggleResolve(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-sm text-slate-700"
                  >
                    {comment.is_resolved ? (
                      <>
                        <Clock className="w-4 h-4" />
                        Unresolve
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Resolve
                      </>
                    )}
                  </button>
                  {(isAuthor || isOwner) && (
                    <button
                      onClick={() => { handleDelete(); setShowMenu(false); }}
                      disabled={deleting}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-sm text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-700 whitespace-pre-wrap">
            {comment.quoted_text && (
              <div className="mb-2 pl-2 border-l-2 border-slate-300 text-slate-500 italic text-xs">
                "{comment.quoted_text}"
              </div>
            )}
            {comment.content}
          </div>
        )}

        {/* Reply button */}
        {canComment && !editing && (
          <button
            onClick={() => setShowReply(!showReply)}
            className="flex items-center gap-1 mt-2 text-xs text-slate-500 hover:text-blue-600"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
        )}

        {/* Reply input */}
        {showReply && (
          <form onSubmit={handleReplySubmit} className="mt-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setShowReply(false); setReplyText(''); }}
                className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!replyText.trim() || submittingReply}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300"
              >
                {submittingReply ? 'Sending...' : 'Reply'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies?.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.comment_id}
              comment={reply}
              sectionId={sectionId}
              isOwner={isOwner}
              canComment={canComment}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onResolve={onResolve}
              onUnresolve={onUnresolve}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Helper Functions
// ==========================================

function countTotalComments(comments) {
  let count = 0;
  const countRecursive = (commentList) => {
    commentList.forEach((comment) => {
      count++;
      if (comment.replies?.length > 0) {
        countRecursive(comment.replies);
      }
    });
  };
  countRecursive(comments);
  return count;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) return 'just now';

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  // Older
  return date.toLocaleDateString();
}
