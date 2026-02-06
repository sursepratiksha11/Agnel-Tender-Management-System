/**
 * Comment Service
 * Handles threaded comments on proposal sections
 */

import { pool } from '../config/db.js';
import { CollaborationService } from './collaboration.service.js';

export const CommentService = {
  // ==========================================
  // PLATFORM TENDER COMMENTS
  // ==========================================

  /**
   * Create a comment on a proposal section
   */
  async createComment({
    proposalId,
    sectionId,
    userId,
    content,
    parentCommentId = null,
    selectionStart = null,
    selectionEnd = null,
    quotedText = null,
  }) {
    // Validate content
    if (!content || !content.trim()) {
      throw new Error('Comment content is required');
    }

    // Validate parent comment if provided
    if (parentCommentId) {
      const parentCheck = await pool.query(
        `SELECT comment_id, proposal_id, section_id
         FROM proposal_comment
         WHERE comment_id = $1`,
        [parentCommentId]
      );

      if (parentCheck.rows.length === 0) {
        throw new Error('Parent comment not found');
      }

      // Ensure parent is from same proposal/section
      const parent = parentCheck.rows[0];
      if (parent.proposal_id !== proposalId || parent.section_id !== sectionId) {
        throw new Error('Parent comment must be from the same section');
      }
    }

    // Insert comment
    const result = await pool.query(
      `INSERT INTO proposal_comment
       (proposal_id, section_id, user_id, content, parent_comment_id, selection_start, selection_end, quoted_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [proposalId, sectionId, userId, content.trim(), parentCommentId, selectionStart, selectionEnd, quotedText]
    );

    // Update comment count on section response
    await pool.query(
      `UPDATE proposal_section_response
       SET comment_count = comment_count + 1
       WHERE proposal_id = $1 AND section_id = $2`,
      [proposalId, sectionId]
    );

    // Log activity
    await CollaborationService.logActivity(proposalId, sectionId, userId, 'COMMENT', {
      commentId: result.rows[0].comment_id,
      isReply: !!parentCommentId,
    });

    // Get user details
    const user = await CollaborationService.getUserById(userId);

    return {
      ...result.rows[0],
      user,
      replies: [],
    };
  },

  /**
   * Get all comments for a section with nested threads
   */
  async getCommentsBySection(proposalId, sectionId) {
    const result = await pool.query(
      `SELECT pc.*, u.name as user_name, u.email as user_email,
              ru.name as resolved_by_name
       FROM proposal_comment pc
       JOIN "user" u ON pc.user_id = u.user_id
       LEFT JOIN "user" ru ON pc.resolved_by = ru.user_id
       WHERE pc.proposal_id = $1 AND pc.section_id = $2
       ORDER BY pc.created_at ASC`,
      [proposalId, sectionId]
    );

    // Build nested tree structure
    return this._buildCommentTree(result.rows);
  },

  /**
   * Build nested comment tree from flat list
   */
  _buildCommentTree(comments) {
    const commentMap = {};
    const rootComments = [];

    // First pass: create lookup map
    comments.forEach(comment => {
      commentMap[comment.comment_id] = {
        ...comment,
        user: {
          user_id: comment.user_id,
          name: comment.user_name,
          email: comment.user_email,
        },
        resolved_by_user: comment.resolved_by ? {
          user_id: comment.resolved_by,
          name: comment.resolved_by_name,
        } : null,
        replies: [],
      };
      // Remove redundant fields
      delete commentMap[comment.comment_id].user_name;
      delete commentMap[comment.comment_id].user_email;
      delete commentMap[comment.comment_id].resolved_by_name;
    });

    // Second pass: build tree
    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap[comment.parent_comment_id];
        if (parent) {
          parent.replies.push(commentMap[comment.comment_id]);
        }
      } else {
        rootComments.push(commentMap[comment.comment_id]);
      }
    });

    return rootComments;
  },

  /**
   * Update a comment (only author can update)
   */
  async updateComment(commentId, userId, content) {
    if (!content || !content.trim()) {
      throw new Error('Comment content is required');
    }

    // Check ownership
    const check = await pool.query(
      `SELECT user_id FROM proposal_comment WHERE comment_id = $1`,
      [commentId]
    );

    if (check.rows.length === 0) {
      throw new Error('Comment not found');
    }

    if (check.rows[0].user_id !== userId) {
      throw new Error('Only comment author can edit');
    }

    const result = await pool.query(
      `UPDATE proposal_comment
       SET content = $1, updated_at = NOW()
       WHERE comment_id = $2
       RETURNING *`,
      [content.trim(), commentId]
    );

    const user = await CollaborationService.getUserById(userId);

    return {
      ...result.rows[0],
      user,
    };
  },

  /**
   * Delete a comment (author or proposal owner can delete)
   */
  async deleteComment(commentId, userId, proposalId) {
    // Get comment details
    const check = await pool.query(
      `SELECT pc.*, p.organization_id
       FROM proposal_comment pc
       JOIN proposal p ON pc.proposal_id = p.proposal_id
       WHERE pc.comment_id = $1`,
      [commentId]
    );

    if (check.rows.length === 0) {
      throw new Error('Comment not found');
    }

    const comment = check.rows[0];

    // Check if user is author or proposal owner
    const isAuthor = comment.user_id === userId;
    const isOwner = await CollaborationService.isProposalOwner(userId, comment.proposal_id);

    if (!isAuthor && !isOwner) {
      throw new Error('Only comment author or proposal owner can delete');
    }

    // Count how many comments will be deleted (including replies)
    const countResult = await pool.query(
      `WITH RECURSIVE comment_tree AS (
         SELECT comment_id FROM proposal_comment WHERE comment_id = $1
         UNION ALL
         SELECT pc.comment_id FROM proposal_comment pc
         JOIN comment_tree ct ON pc.parent_comment_id = ct.comment_id
       )
       SELECT COUNT(*) as count FROM comment_tree`,
      [commentId]
    );

    const deleteCount = parseInt(countResult.rows[0].count) || 1;

    // Delete comment (cascade will handle replies)
    await pool.query(
      `DELETE FROM proposal_comment WHERE comment_id = $1`,
      [commentId]
    );

    // Update comment count
    await pool.query(
      `UPDATE proposal_section_response
       SET comment_count = GREATEST(0, comment_count - $1)
       WHERE proposal_id = $2 AND section_id = $3`,
      [deleteCount, comment.proposal_id, comment.section_id]
    );

    return { deleted: true, count: deleteCount };
  },

  /**
   * Resolve a comment thread
   */
  async resolveComment(commentId, userId) {
    // Get comment
    const check = await pool.query(
      `SELECT * FROM proposal_comment WHERE comment_id = $1`,
      [commentId]
    );

    if (check.rows.length === 0) {
      throw new Error('Comment not found');
    }

    const comment = check.rows[0];

    // Resolve the comment and all its replies
    await pool.query(
      `WITH RECURSIVE comment_tree AS (
         SELECT comment_id FROM proposal_comment WHERE comment_id = $1
         UNION ALL
         SELECT pc.comment_id FROM proposal_comment pc
         JOIN comment_tree ct ON pc.parent_comment_id = ct.comment_id
       )
       UPDATE proposal_comment
       SET is_resolved = true, resolved_by = $2, resolved_at = NOW()
       WHERE comment_id IN (SELECT comment_id FROM comment_tree)`,
      [commentId, userId]
    );

    // Log activity
    await CollaborationService.logActivity(
      comment.proposal_id,
      comment.section_id,
      userId,
      'RESOLVE_COMMENT',
      { commentId }
    );

    return { resolved: true };
  },

  /**
   * Unresolve a comment thread
   */
  async unresolveComment(commentId, userId) {
    // Get comment
    const check = await pool.query(
      `SELECT * FROM proposal_comment WHERE comment_id = $1`,
      [commentId]
    );

    if (check.rows.length === 0) {
      throw new Error('Comment not found');
    }

    const comment = check.rows[0];

    // Unresolve the comment and all its replies
    await pool.query(
      `WITH RECURSIVE comment_tree AS (
         SELECT comment_id FROM proposal_comment WHERE comment_id = $1
         UNION ALL
         SELECT pc.comment_id FROM proposal_comment pc
         JOIN comment_tree ct ON pc.parent_comment_id = ct.comment_id
       )
       UPDATE proposal_comment
       SET is_resolved = false, resolved_by = NULL, resolved_at = NULL
       WHERE comment_id IN (SELECT comment_id FROM comment_tree)`,
      [commentId]
    );

    return { resolved: false };
  },

  /**
   * Get comment counts per section for a proposal
   */
  async getCommentCounts(proposalId) {
    const result = await pool.query(
      `SELECT section_id,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE is_resolved = false) as unresolved
       FROM proposal_comment
       WHERE proposal_id = $1
       GROUP BY section_id`,
      [proposalId]
    );

    const counts = {};
    result.rows.forEach(row => {
      counts[row.section_id] = {
        total: parseInt(row.total),
        unresolved: parseInt(row.unresolved),
      };
    });

    return counts;
  },

  // ==========================================
  // UPLOADED TENDER COMMENTS
  // ==========================================

  /**
   * Create comment on uploaded tender section
   */
  async createUploadedComment({
    uploadedTenderId,
    sectionKey,
    userId,
    content,
    parentCommentId = null,
    quotedText = null,
  }) {
    if (!content || !content.trim()) {
      throw new Error('Comment content is required');
    }

    // Validate parent if provided
    if (parentCommentId) {
      const parentCheck = await pool.query(
        `SELECT comment_id, uploaded_tender_id, section_key
         FROM uploaded_proposal_comment
         WHERE comment_id = $1`,
        [parentCommentId]
      );

      if (parentCheck.rows.length === 0) {
        throw new Error('Parent comment not found');
      }

      const parent = parentCheck.rows[0];
      if (parent.uploaded_tender_id !== uploadedTenderId || parent.section_key !== sectionKey) {
        throw new Error('Parent comment must be from the same section');
      }
    }

    const result = await pool.query(
      `INSERT INTO uploaded_proposal_comment
       (uploaded_tender_id, section_key, user_id, content, parent_comment_id, quoted_text)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uploadedTenderId, sectionKey, userId, content.trim(), parentCommentId, quotedText]
    );

    const user = await CollaborationService.getUserById(userId);

    return {
      ...result.rows[0],
      user,
      replies: [],
    };
  },

  /**
   * Get comments for uploaded tender section
   */
  async getUploadedCommentsBySection(uploadedTenderId, sectionKey) {
    const result = await pool.query(
      `SELECT upc.*, u.name as user_name, u.email as user_email,
              ru.name as resolved_by_name
       FROM uploaded_proposal_comment upc
       JOIN "user" u ON upc.user_id = u.user_id
       LEFT JOIN "user" ru ON upc.resolved_by = ru.user_id
       WHERE upc.uploaded_tender_id = $1 AND upc.section_key = $2
       ORDER BY upc.created_at ASC`,
      [uploadedTenderId, sectionKey]
    );

    return this._buildUploadedCommentTree(result.rows);
  },

  /**
   * Build comment tree for uploaded tender comments
   */
  _buildUploadedCommentTree(comments) {
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      commentMap[comment.comment_id] = {
        ...comment,
        user: {
          user_id: comment.user_id,
          name: comment.user_name,
          email: comment.user_email,
        },
        resolved_by_user: comment.resolved_by ? {
          user_id: comment.resolved_by,
          name: comment.resolved_by_name,
        } : null,
        replies: [],
      };
      delete commentMap[comment.comment_id].user_name;
      delete commentMap[comment.comment_id].user_email;
      delete commentMap[comment.comment_id].resolved_by_name;
    });

    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap[comment.parent_comment_id];
        if (parent) {
          parent.replies.push(commentMap[comment.comment_id]);
        }
      } else {
        rootComments.push(commentMap[comment.comment_id]);
      }
    });

    return rootComments;
  },

  /**
   * Update uploaded tender comment
   */
  async updateUploadedComment(commentId, userId, content) {
    if (!content || !content.trim()) {
      throw new Error('Comment content is required');
    }

    const check = await pool.query(
      `SELECT user_id FROM uploaded_proposal_comment WHERE comment_id = $1`,
      [commentId]
    );

    if (check.rows.length === 0) {
      throw new Error('Comment not found');
    }

    if (check.rows[0].user_id !== userId) {
      throw new Error('Only comment author can edit');
    }

    const result = await pool.query(
      `UPDATE uploaded_proposal_comment
       SET content = $1, updated_at = NOW()
       WHERE comment_id = $2
       RETURNING *`,
      [content.trim(), commentId]
    );

    const user = await CollaborationService.getUserById(userId);

    return {
      ...result.rows[0],
      user,
    };
  },

  /**
   * Delete uploaded tender comment
   */
  async deleteUploadedComment(commentId, userId, uploadedTenderId) {
    const check = await pool.query(
      `SELECT upc.*, ut.organization_id
       FROM uploaded_proposal_comment upc
       JOIN uploaded_tender ut ON upc.uploaded_tender_id = ut.id
       WHERE upc.comment_id = $1`,
      [commentId]
    );

    if (check.rows.length === 0) {
      throw new Error('Comment not found');
    }

    const comment = check.rows[0];
    const isAuthor = comment.user_id === userId;
    const isOwner = await CollaborationService.isUploadedTenderOwner(userId, comment.uploaded_tender_id);

    if (!isAuthor && !isOwner) {
      throw new Error('Only comment author or tender owner can delete');
    }

    await pool.query(
      `DELETE FROM uploaded_proposal_comment WHERE comment_id = $1`,
      [commentId]
    );

    return { deleted: true };
  },

  /**
   * Resolve uploaded tender comment
   */
  async resolveUploadedComment(commentId, userId) {
    const check = await pool.query(
      `SELECT * FROM uploaded_proposal_comment WHERE comment_id = $1`,
      [commentId]
    );

    if (check.rows.length === 0) {
      throw new Error('Comment not found');
    }

    await pool.query(
      `WITH RECURSIVE comment_tree AS (
         SELECT comment_id FROM uploaded_proposal_comment WHERE comment_id = $1
         UNION ALL
         SELECT upc.comment_id FROM uploaded_proposal_comment upc
         JOIN comment_tree ct ON upc.parent_comment_id = ct.comment_id
       )
       UPDATE uploaded_proposal_comment
       SET is_resolved = true, resolved_by = $2, resolved_at = NOW()
       WHERE comment_id IN (SELECT comment_id FROM comment_tree)`,
      [commentId, userId]
    );

    return { resolved: true };
  },

  /**
   * Get comment counts for uploaded tender
   */
  async getUploadedCommentCounts(uploadedTenderId) {
    const result = await pool.query(
      `SELECT section_key,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE is_resolved = false) as unresolved
       FROM uploaded_proposal_comment
       WHERE uploaded_tender_id = $1
       GROUP BY section_key`,
      [uploadedTenderId]
    );

    const counts = {};
    result.rows.forEach(row => {
      counts[row.section_key] = {
        total: parseInt(row.total),
        unresolved: parseInt(row.unresolved),
      };
    });

    return counts;
  },
};

export default CommentService;
