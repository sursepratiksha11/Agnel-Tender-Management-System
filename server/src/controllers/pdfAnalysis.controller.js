/**
 * PDF Analysis Controller
 * Handles PDF upload, analysis, and proposal evaluation
 * UPDATED: Multi-step evaluation with minimal payload
 */
import { PDFAnalysisService } from '../services/pdfAnalysis.service.js';
import { MultiStepEvaluationService } from '../services/multiStepEvaluation.service.js';
import { UploadedTenderService } from '../services/uploadedTender.service.js';
import { SavedTenderService } from '../services/savedTender.service.js';
import { ProposalPdfExportService } from '../services/proposalPdfExport.service.js';
import { pool } from '../config/db.js';

export const PDFAnalysisController = {
  /**
   * Upload and analyze a PDF tender document
   * POST /api/pdf/analyze
   */
  async analyzePDF(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Please upload a PDF file.',
        });
      }

      // Validate file type
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only PDF files are accepted.',
        });
      }

      // Validate file size (max 15MB)
      if (req.file.size > 15 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 15MB.',
        });
      }

      console.log(`[PDF Analysis] Processing: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);

      // Analyze the PDF
      const analysis = await PDFAnalysisService.analyzeUploadedPDF(
        req.file.buffer,
        req.file.originalname
      );

      if (!analysis.success) {
        return res.status(422).json({
          success: false,
          error: analysis.error || 'Failed to analyze PDF',
          stage: analysis.stage,
        });
      }

      console.log(`[PDF Analysis] Complete: ${analysis.parsed.sections.length} sections, ${analysis.parsed.stats.totalWords} words`);
      console.log(`[PDF Analysis] Controller received normalizedSections: ${analysis.normalizedSections?.length || 0} sections`);

      // Auto-save to database for discovery
      let savedTender = null;
      let isExistingTender = false;
      try {
        if (req.user && req.user.organizationId) {
          // Check if tender already exists
          const existingCheck = await pool.query(
            `SELECT uploaded_tender_id FROM uploaded_tender 
             WHERE user_id = $1 AND title = $2 LIMIT 1`,
            [req.user.id, analysis.parsed.title || req.file.originalname.replace('.pdf', '')]
          );
          
          isExistingTender = existingCheck.rows.length > 0;
          
          savedTender = await UploadedTenderService.create(
            {
              title: analysis.parsed.title || req.file.originalname.replace('.pdf', ''),
              description: analysis.summary?.executiveSummary?.substring(0, 500) || '',
              source: 'PDF_UPLOAD',
              originalFilename: req.file.originalname,
              fileSize: req.file.size,
              parsedData: analysis.parsed,
              analysisData: {
                summary: analysis.summary,
                proposalDraft: analysis.proposalDraft,
              },
              metadata: analysis.parsed.metadata || {},
            },
            req.user.id,
            req.user.organizationId
          );
          
          if (isExistingTender) {
            console.log(`[PDF Analysis] Updated existing tender: ${savedTender.id}`);
          } else {
            console.log(`[PDF Analysis] Saved new tender to database: ${savedTender.id}`);
          }

          // Auto-save to user's saved tenders list
          try {
            await SavedTenderService.saveTender(
              { uploadedTenderId: savedTender.id },
              req.user.id,
              req.user.organizationId
            );
            console.log(`[PDF Analysis] Auto-saved to user's saved tenders`);
          } catch (autoSaveErr) {
            console.error('[PDF Analysis] Failed to auto-save:', autoSaveErr.message);
          }
        }
      } catch (saveErr) {
        // Log but don't fail the request if save fails
        console.error('[PDF Analysis] Failed to save to database:', saveErr.message);
      }

      const responseData = {
        ...analysis,
        // Include saved tender info if available
        savedTenderId: savedTender?.id || null,
        savedToDiscovery: !!savedTender,
        isExistingTender,
        message: isExistingTender 
          ? 'Tender already exists - Updated with new analysis' 
          : 'New tender saved successfully',
      };

      console.log('[PDF Analysis] Sending response - keys:', Object.keys(responseData));
      console.log('[PDF Analysis] Sending response - normalizedSections exists:', !!responseData.normalizedSections);
      console.log('[PDF Analysis] Sending response - normalizedSections count:', responseData.normalizedSections?.length || 0);

      return res.json({
        success: true,
        data: responseData,
      });
    } catch (err) {
      console.error('[PDF Analysis] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error during PDF analysis',
      });
    }
  },

  /**
   * Evaluate a proposal against tender requirements
   * POST /api/pdf/evaluate
   * UPDATED: Accepts minimal payload {sessionId, proposal: {sections}}
   */
  async evaluateProposal(req, res) {
    try {
      const { sessionId, proposal, tenderId } = req.body;

      // Validate sessionId (required for backend-driven evaluation)
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required for evaluation.',
        });
      }

      // Validate minimal proposal data
      if (!proposal || !proposal.sections || !Array.isArray(proposal.sections)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid proposal data. Expected sections array.',
        });
      }

      // Check payload size (should be minimal now)
      const payloadSize = JSON.stringify(req.body).length;
      console.log(`[Proposal Evaluation] Payload size: ${(payloadSize / 1024).toFixed(1)}KB`);

      if (payloadSize > 500000) { // 500KB warning threshold
        console.warn(`[Proposal Evaluation] Large payload detected: ${(payloadSize / 1024).toFixed(1)}KB`);
      }

      console.log(`[Proposal Evaluation] Session: ${sessionId}, Sections: ${proposal.sections.length}`);

      // Use multi-step evaluation service
      const evaluation = await MultiStepEvaluationService.evaluateProposal(
        sessionId,
        proposal,
        tenderId
      );

      return res.json({
        success: true,
        data: evaluation,
      });
    } catch (err) {
      console.error('[Proposal Evaluation] Error:', err);
      
      // Check for specific error types
      if (err.message?.includes('token limit')) {
        return res.status(422).json({
          success: false,
          error: 'Content too large for evaluation. Please reduce proposal size.',
        });
      }

      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error during evaluation',
      });
    }
  },

  /**
   * Re-generate a specific proposal section
   * POST /api/pdf/regenerate-section
   */
  async regenerateSection(req, res) {
    try {
      const { sectionId, sectionTitle, tenderContext, currentContent, instructions } = req.body;

      if (!sectionId || !sectionTitle) {
        return res.status(400).json({
          success: false,
          error: 'Section ID and title are required.',
        });
      }

      // Use GROQ to regenerate the section
      const systemPrompt = `You are an expert proposal writer for government tenders. Regenerate the specified proposal section based on the user's instructions.

Write professional, detailed content suitable for a government tender proposal. Use placeholders like [BIDDER_NAME], [COMPANY_INFO] where specific bidder information is needed.`;

      const userPrompt = `Regenerate this proposal section:

SECTION: ${sectionTitle}

TENDER CONTEXT: ${tenderContext || 'Government tender'}

CURRENT CONTENT:
${currentContent || 'Empty'}

USER INSTRUCTIONS: ${instructions || 'Improve and make more detailed'}

Write the improved section content directly (no JSON, just the content).`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.4,
          max_tokens: 2000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate section');
      }

      const data = await response.json();
      const newContent = data?.choices?.[0]?.message?.content?.trim() || currentContent;

      return res.json({
        success: true,
        data: {
          sectionId,
          title: sectionTitle,
          content: newContent,
          wordCount: newContent.split(/\s+/).filter(w => w).length,
          regeneratedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[Section Regenerate] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to regenerate section',
      });
    }
  },

  /**
   * Export proposal as professional PDF
   * POST /api/pdf/export
   */
  async exportProposalPDF(req, res) {
    try {
      const { proposalSections, tenderInfo, companyInfo, template } = req.body;

      if (!proposalSections || !Array.isArray(proposalSections) || proposalSections.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Proposal sections are required for export.',
        });
      }

      console.log(`[PDF Export] Generating PDF with ${proposalSections.length} sections, template: ${template || 'government'}`);

      // Get user/company info from request if not provided
      const finalCompanyInfo = companyInfo || {
        name: req.user?.organizationName || '[BIDDER NAME]',
        email: req.user?.email || '[EMAIL]',
      };

      const finalTenderInfo = tenderInfo || {
        title: 'Tender Proposal',
      };

      // Generate the PDF
      const pdfBuffer = await ProposalPdfExportService.generateProposalPDF(
        { sections: proposalSections },
        finalTenderInfo,
        finalCompanyInfo,
        template || 'government'
      );

      // Set response headers for PDF download
      const filename = `Proposal_${(finalTenderInfo.title || 'Tender').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${Date.now()}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (err) {
      console.error('[PDF Export] Error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate PDF export',
      });
    }
  },

  /**
   * Get available export templates
   * GET /api/pdf/templates
   */
  async getExportTemplates(req, res) {
    try {
      const templates = ProposalPdfExportService.getTemplates();
      return res.json({
        success: true,
        data: templates,
      });
    } catch (err) {
      console.error('[PDF Templates] Error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve templates',
      });
    }
  },
};
