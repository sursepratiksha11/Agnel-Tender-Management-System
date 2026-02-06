/**
 * Collaboration Context
 * Manages state for collaborative proposal drafting
 * - Section assignments
 * - User permissions
 * - Comments
 * - Activity tracking
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { collaborationService } from '../services/bidder/collaborationService';

const CollaborationContext = createContext(null);

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}

export function CollaborationProvider({
  children,
  proposalId = null,
  uploadedTenderId = null,
  tenderType = 'platform', // 'platform' or 'uploaded'
}) {
  // Core state
  const [isOwner, setIsOwner] = useState(false);
  const [assignments, setAssignments] = useState({}); // { sectionId: [users] }
  const [userPermissions, setUserPermissions] = useState({}); // { sectionId: permission }
  const [lastEdits, setLastEdits] = useState({}); // { sectionId: { user_name, edited_at } }
  const [activity, setActivity] = useState([]);

  // Comments state (per section)
  const [comments, setComments] = useState({}); // { sectionId: [comments] }
  const [commentCounts, setCommentCounts] = useState({}); // { sectionId: { total, unresolved } }

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Identifiers
  const entityId = tenderType === 'platform' ? proposalId : uploadedTenderId;

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadCollaborationData = useCallback(async () => {
    // If no entityId, set default state and stop loading
    if (!entityId) {
      setLoading(false);
      setIsOwner(true); // Treat as owner when no saved tender (user owns their own draft)
      setAssignments({});
      setUserPermissions({});
      setLastEdits({});
      setActivity([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data;
      if (tenderType === 'platform') {
        data = await collaborationService.getCollaborationData(proposalId);
      } else {
        data = await collaborationService.getUploadedCollaborationData(uploadedTenderId);
      }

      setIsOwner(data.isOwner || false);
      setAssignments(data.assignments || {});
      setUserPermissions(data.userPermissions || {});
      setLastEdits(data.lastEdits || {});
      setActivity(data.recentActivity || []);

    } catch (err) {
      console.error('[CollaborationContext] Load error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [entityId, tenderType, proposalId, uploadedTenderId]);

  // Load data on mount
  useEffect(() => {
    loadCollaborationData();
  }, [loadCollaborationData]);

  // ==========================================
  // PERMISSION HELPERS
  // ==========================================

  /**
   * Check if current user can edit a section
   */
  const canEditSection = useCallback((sectionId) => {
    if (isOwner) return true;
    const permission = userPermissions[sectionId];
    return permission === 'EDIT';
  }, [isOwner, userPermissions]);

  /**
   * Check if current user can comment on a section
   */
  const canCommentSection = useCallback((sectionId) => {
    if (isOwner) return true;
    const permission = userPermissions[sectionId];
    return permission === 'EDIT' || permission === 'READ_AND_COMMENT';
  }, [isOwner, userPermissions]);

  /**
   * Get user's permission for a section
   */
  const getSectionPermission = useCallback((sectionId) => {
    if (isOwner) return 'OWNER';
    return userPermissions[sectionId] || null;
  }, [isOwner, userPermissions]);

  /**
   * Check if user has any access to section
   */
  const hasAccessToSection = useCallback((sectionId) => {
    if (isOwner) return true;
    return !!userPermissions[sectionId];
  }, [isOwner, userPermissions]);

  // ==========================================
  // ASSIGNMENT ACTIONS
  // ==========================================

  /**
   * Assign a user to a section
   */
  const assignUser = useCallback(async (sectionId, userId, permission) => {
    try {
      // Validate inputs
      if (!sectionId || !userId) {
        throw new Error('sectionId and userId are required');
      }

      // Validate tender/proposal ID
      if (tenderType === 'platform' && !proposalId) {
        throw new Error('proposalId is required for platform tenders');
      }
      if (tenderType === 'uploaded' && !uploadedTenderId) {
        throw new Error('uploadedTenderId is required for uploaded tenders');
      }

      let result;
      if (tenderType === 'platform') {
        result = await collaborationService.assignUser(proposalId, sectionId, userId, permission);
      } else {
        result = await collaborationService.assignUserToUploaded(uploadedTenderId, sectionId, userId, permission);
      }

      // Update local state
      setAssignments(prev => {
        const sectionAssignments = prev[sectionId] || [];
        const existingIndex = sectionAssignments.findIndex(a => a.user_id === userId);

        if (existingIndex >= 0) {
          // Update existing assignment
          const updated = [...sectionAssignments];
          updated[existingIndex] = {
            ...updated[existingIndex],
            permission,
            ...result.user,
          };
          return { ...prev, [sectionId]: updated };
        } else {
          // Add new assignment
          return {
            ...prev,
            [sectionId]: [...sectionAssignments, {
              user_id: userId,
              permission,
              name: result.user?.name,
              email: result.user?.email,
              assigned_at: new Date().toISOString(),
            }],
          };
        }
      });

      return result;
    } catch (err) {
      console.error('[CollaborationContext] Assign error:', err);
      throw err;
    }
  }, [tenderType, proposalId, uploadedTenderId]);

  /**
   * Remove user assignment from a section
   */
  const removeAssignment = useCallback(async (sectionId, userId) => {
    try {
      if (tenderType === 'platform') {
        await collaborationService.removeAssignment(proposalId, sectionId, userId);
      } else {
        await collaborationService.removeUploadedAssignment(uploadedTenderId, sectionId, userId);
      }

      // Update local state
      setAssignments(prev => {
        const sectionAssignments = prev[sectionId] || [];
        return {
          ...prev,
          [sectionId]: sectionAssignments.filter(a => a.user_id !== userId),
        };
      });
    } catch (err) {
      console.error('[CollaborationContext] Remove assignment error:', err);
      throw err;
    }
  }, [tenderType, proposalId, uploadedTenderId]);

  // ==========================================
  // COMMENT ACTIONS
  // ==========================================

  /**
   * Load comments for a section
   */
  const loadComments = useCallback(async (sectionId) => {
    try {
      let sectionComments;
      if (tenderType === 'platform') {
        sectionComments = await collaborationService.getComments(proposalId, sectionId);
      } else {
        sectionComments = await collaborationService.getUploadedComments(uploadedTenderId, sectionId);
      }

      setComments(prev => ({
        ...prev,
        [sectionId]: sectionComments,
      }));

      return sectionComments;
    } catch (err) {
      console.error('[CollaborationContext] Load comments error:', err);
      throw err;
    }
  }, [tenderType, proposalId, uploadedTenderId]);

  /**
   * Add a comment
   */
  const addComment = useCallback(async (sectionId, content, parentCommentId = null, quotedText = null) => {
    try {
      let newComment;
      if (tenderType === 'platform') {
        newComment = await collaborationService.createComment({
          proposalId,
          sectionId,
          content,
          parentCommentId,
          quotedText,
        });
      } else {
        newComment = await collaborationService.createUploadedComment({
          uploadedTenderId,
          sectionKey: sectionId,
          content,
          parentCommentId,
          quotedText,
        });
      }

      // Update local state
      if (parentCommentId) {
        // Add as reply - need to find parent and add to its replies
        setComments(prev => {
          const sectionComments = prev[sectionId] || [];
          return {
            ...prev,
            [sectionId]: addReplyToComment(sectionComments, parentCommentId, newComment),
          };
        });
      } else {
        // Add as new root comment
        setComments(prev => ({
          ...prev,
          [sectionId]: [...(prev[sectionId] || []), newComment],
        }));
      }

      // Update count
      setCommentCounts(prev => ({
        ...prev,
        [sectionId]: {
          total: (prev[sectionId]?.total || 0) + 1,
          unresolved: (prev[sectionId]?.unresolved || 0) + 1,
        },
      }));

      return newComment;
    } catch (err) {
      console.error('[CollaborationContext] Add comment error:', err);
      throw err;
    }
  }, [tenderType, proposalId, uploadedTenderId]);

  /**
   * Update a comment
   */
  const updateComment = useCallback(async (commentId, content) => {
    try {
      const updated = await collaborationService.updateComment(commentId, content);

      // Update in local state (need to find in nested structure)
      setComments(prev => {
        const newComments = {};
        Object.entries(prev).forEach(([sectionId, sectionComments]) => {
          newComments[sectionId] = updateCommentInTree(sectionComments, commentId, updated);
        });
        return newComments;
      });

      return updated;
    } catch (err) {
      console.error('[CollaborationContext] Update comment error:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(async (commentId, sectionId) => {
    try {
      const result = await collaborationService.deleteComment(commentId, proposalId);

      // Remove from local state
      setComments(prev => ({
        ...prev,
        [sectionId]: removeCommentFromTree(prev[sectionId] || [], commentId),
      }));

      // Update count
      setCommentCounts(prev => ({
        ...prev,
        [sectionId]: {
          total: Math.max(0, (prev[sectionId]?.total || 0) - (result.count || 1)),
          unresolved: Math.max(0, (prev[sectionId]?.unresolved || 0) - (result.count || 1)),
        },
      }));

      return result;
    } catch (err) {
      console.error('[CollaborationContext] Delete comment error:', err);
      throw err;
    }
  }, [proposalId]);

  /**
   * Resolve a comment
   */
  const resolveComment = useCallback(async (commentId, sectionId) => {
    try {
      await collaborationService.resolveComment(commentId);

      // Update in local state
      setComments(prev => ({
        ...prev,
        [sectionId]: markCommentResolved(prev[sectionId] || [], commentId, true),
      }));

      // Update unresolved count
      setCommentCounts(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          unresolved: Math.max(0, (prev[sectionId]?.unresolved || 0) - 1),
        },
      }));
    } catch (err) {
      console.error('[CollaborationContext] Resolve comment error:', err);
      throw err;
    }
  }, []);

  /**
   * Unresolve a comment
   */
  const unresolveComment = useCallback(async (commentId, sectionId) => {
    try {
      await collaborationService.unresolveComment(commentId);

      // Update in local state
      setComments(prev => ({
        ...prev,
        [sectionId]: markCommentResolved(prev[sectionId] || [], commentId, false),
      }));

      // Update unresolved count
      setCommentCounts(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          unresolved: (prev[sectionId]?.unresolved || 0) + 1,
        },
      }));
    } catch (err) {
      console.error('[CollaborationContext] Unresolve comment error:', err);
      throw err;
    }
  }, []);

  // ==========================================
  // AI DRAFTING
  // ==========================================

  /**
   * Generate AI draft for a section
   */
  const generateDraft = useCallback(async (sectionId, customInstructions = '') => {
    try {
      let result;
      if (tenderType === 'platform') {
        result = await collaborationService.generateDraft(proposalId, sectionId, customInstructions);
      } else {
        result = await collaborationService.generateUploadedDraft(uploadedTenderId, sectionId, customInstructions);
      }
      return result;
    } catch (err) {
      console.error('[CollaborationContext] Generate draft error:', err);
      throw err;
    }
  }, [tenderType, proposalId, uploadedTenderId]);

  // ==========================================
  // VALIDATION
  // ==========================================

  /**
   * Validate proposal against tender requirements
   */
  const validateProposal = useCallback(async () => {
    try {
      let result;
      if (tenderType === 'platform') {
        result = await collaborationService.validateProposal(proposalId);
      } else {
        result = await collaborationService.validateUploadedProposal(uploadedTenderId);
      }
      return result;
    } catch (err) {
      console.error('[CollaborationContext] Validate error:', err);
      throw err;
    }
  }, [tenderType, proposalId, uploadedTenderId]);

  // ==========================================
  // ACTIVITY
  // ==========================================

  /**
   * Refresh activity log
   */
  const refreshActivity = useCallback(async () => {
    if (tenderType !== 'platform' || !proposalId) return;

    try {
      const activityData = await collaborationService.getActivity(proposalId);
      setActivity(activityData);
    } catch (err) {
      console.error('[CollaborationContext] Refresh activity error:', err);
    }
  }, [tenderType, proposalId]);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = {
    // State
    isOwner,
    assignments,
    userPermissions,
    lastEdits,
    activity,
    comments,
    commentCounts,
    loading,
    error,

    // Permission helpers
    canEditSection,
    canCommentSection,
    getSectionPermission,
    hasAccessToSection,

    // Assignment actions
    assignUser,
    removeAssignment,

    // Comment actions
    loadComments,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,

    // AI drafting
    generateDraft,

    // Validation
    validateProposal,

    // Activity
    refreshActivity,

    // Refresh all data
    refresh: loadCollaborationData,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function addReplyToComment(comments, parentId, newReply) {
  return comments.map(comment => {
    if (comment.comment_id === parentId) {
      return {
        ...comment,
        replies: [...(comment.replies || []), newReply],
      };
    }
    if (comment.replies?.length > 0) {
      return {
        ...comment,
        replies: addReplyToComment(comment.replies, parentId, newReply),
      };
    }
    return comment;
  });
}

function updateCommentInTree(comments, commentId, updated) {
  return comments.map(comment => {
    if (comment.comment_id === commentId) {
      return { ...comment, ...updated };
    }
    if (comment.replies?.length > 0) {
      return {
        ...comment,
        replies: updateCommentInTree(comment.replies, commentId, updated),
      };
    }
    return comment;
  });
}

function removeCommentFromTree(comments, commentId) {
  return comments
    .filter(comment => comment.comment_id !== commentId)
    .map(comment => ({
      ...comment,
      replies: comment.replies ? removeCommentFromTree(comment.replies, commentId) : [],
    }));
}

function markCommentResolved(comments, commentId, resolved) {
  return comments.map(comment => {
    if (comment.comment_id === commentId) {
      return { ...comment, is_resolved: resolved };
    }
    if (comment.replies?.length > 0) {
      return {
        ...comment,
        replies: markCommentResolved(comment.replies, commentId, resolved),
      };
    }
    return comment;
  });
}

export default CollaborationContext;
