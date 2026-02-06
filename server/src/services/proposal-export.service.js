/**
 * Proposal Export Service
 * Handles PDF and DOCX generation for proposals
 */

import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { pool } from '../config/db.js';

/**
 * Template configurations
 */
const TEMPLATES = {
  formal: {
    name: 'Formal',
    colors: { primary: '#1a365d', secondary: '#2d3748', accent: '#4a5568' },
    fonts: { heading: 'Helvetica-Bold', body: 'Helvetica' },
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  },
  modern: {
    name: 'Modern',
    colors: { primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6' },
    fonts: { heading: 'Helvetica-Bold', body: 'Helvetica' },
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  },
  minimal: {
    name: 'Minimal',
    colors: { primary: '#111827', secondary: '#374151', accent: '#6b7280' },
    fonts: { heading: 'Helvetica-Bold', body: 'Helvetica' },
    margins: { top: 60, bottom: 60, left: 60, right: 60 }
  }
};

export const ProposalExportService = {
  /**
   * Get full proposal data for export
   */
  async getProposalForExport(proposalId, user) {
    // Get proposal with tender info
    const proposalRes = await pool.query(
      `SELECT p.proposal_id, p.tender_id, p.organization_id, p.status,
              p.created_at, p.updated_at, p.finalized_at, p.published_at, p.submitted_at,
              t.title as tender_title, t.description as tender_description,
              t.submission_deadline, t.estimated_value,
              org.name as organization_name,
              tender_org.name as tender_organization_name
       FROM proposal p
       JOIN tender t ON p.tender_id = t.tender_id
       JOIN organization org ON p.organization_id = org.organization_id
       JOIN organization tender_org ON t.organization_id = tender_org.organization_id
       WHERE p.proposal_id = $1`,
      [proposalId]
    );

    if (proposalRes.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const proposal = proposalRes.rows[0];

    // Check access - bidder can only export their own proposals
    if (user.role === 'BIDDER' && proposal.organization_id !== user.organizationId) {
      throw new Error('Forbidden');
    }

    // Get section responses with section details
    const sectionsRes = await pool.query(
      `SELECT ts.section_id, ts.title as section_title, ts.description as section_description,
              ts.is_mandatory, ts.order_index,
              psr.content, psr.updated_at as response_updated_at
       FROM tender_section ts
       LEFT JOIN proposal_section_response psr ON ts.section_id = psr.section_id AND psr.proposal_id = $1
       WHERE ts.tender_id = $2
       ORDER BY ts.order_index ASC`,
      [proposalId, proposal.tender_id]
    );

    return {
      ...proposal,
      sections: sectionsRes.rows
    };
  },

  /**
   * Generate PDF export
   */
  async generatePDF(proposalId, template, user) {
    const proposal = await this.getProposalForExport(proposalId, user);
    const config = TEMPLATES[template] || TEMPLATES.formal;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: config.margins,
          bufferPages: true
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Helper function to convert hex to RGB
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
          ] : [0, 0, 0];
        };

        // Title Page
        doc.fontSize(28)
           .font(config.fonts.heading)
           .fillColor(config.colors.primary)
           .text('PROPOSAL', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(18)
           .fillColor(config.colors.secondary)
           .text(proposal.tender_title, { align: 'center' });

        doc.moveDown(2);

        // Divider line
        const primaryRgb = hexToRgb(config.colors.accent);
        doc.strokeColor(primaryRgb)
           .lineWidth(2)
           .moveTo(150, doc.y)
           .lineTo(450, doc.y)
           .stroke();

        doc.moveDown(2);

        // Organization info
        doc.fontSize(14)
           .font(config.fonts.body)
           .fillColor(config.colors.secondary)
           .text(`Submitted by: ${proposal.organization_name}`, { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(12)
           .fillColor(config.colors.accent)
           .text(`To: ${proposal.tender_organization_name}`, { align: 'center' });

        doc.moveDown(2);

        // Metadata box
        doc.fontSize(10)
           .fillColor(config.colors.accent)
           .text(`Version: ${proposal.version || 1}`, { align: 'center' });
        doc.text(`Status: ${proposal.status}`, { align: 'center' });
        doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });

        // New page for content
        doc.addPage();

        // Table of Contents
        doc.fontSize(20)
           .font(config.fonts.heading)
           .fillColor(config.colors.primary)
           .text('Table of Contents', { align: 'left' });

        doc.moveDown(1);

        proposal.sections.forEach((section, index) => {
          doc.fontSize(12)
             .font(config.fonts.body)
             .fillColor(config.colors.secondary)
             .text(`${index + 1}. ${section.section_title}`, {
               continued: false,
               indent: 20
             });
        });

        // Content sections
        proposal.sections.forEach((section, index) => {
          doc.addPage();

          // Section header
          doc.fontSize(16)
             .font(config.fonts.heading)
             .fillColor(config.colors.primary)
             .text(`${index + 1}. ${section.section_title}`);

          if (section.is_mandatory) {
            doc.fontSize(9)
               .fillColor('#dc2626')
               .text('* Required Section');
          }

          doc.moveDown(0.5);

          // Section description if available
          if (section.section_description) {
            doc.fontSize(10)
               .font(config.fonts.body)
               .fillColor(config.colors.accent)
               .text(section.section_description, { oblique: true });
            doc.moveDown(0.5);
          }

          // Section content
          doc.fontSize(11)
             .font(config.fonts.body)
             .fillColor(config.colors.secondary)
             .text(section.content || '[No response provided]', {
               align: 'justify',
               lineGap: 2
             });
        });

        // Footer on all pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .fillColor(config.colors.accent)
             .text(
               `Page ${i + 1} of ${pages.count} | ${proposal.tender_title} | Generated ${new Date().toISOString()}`,
               50,
               doc.page.height - 30,
               { align: 'center', width: doc.page.width - 100 }
             );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Generate DOCX export
   */
  async generateDOCX(proposalId, template, user) {
    const proposal = await this.getProposalForExport(proposalId, user);
    const config = TEMPLATES[template] || TEMPLATES.formal;

    const children = [];

    // Title
    children.push(
      new Paragraph({
        text: 'PROPOSAL',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Tender title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: proposal.tender_title,
            bold: true,
            size: 36
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Organization info
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Submitted by: ', bold: true }),
          new TextRun({ text: proposal.organization_name })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'To: ', bold: true }),
          new TextRun({ text: proposal.tender_organization_name })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Metadata
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Version: ${proposal.version || 1} | Status: ${proposal.status} | Date: ${new Date().toLocaleDateString()}`, size: 20, color: '666666' })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    );

    // Divider
    children.push(
      new Paragraph({
        text: '─'.repeat(50),
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Table of Contents header
    children.push(
      new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );

    // TOC entries
    proposal.sections.forEach((section, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. ${section.section_title}` })
          ],
          spacing: { after: 100 },
          indent: { left: 720 }
        })
      );
    });

    // Page break before content
    children.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true
      })
    );

    // Content sections
    proposal.sections.forEach((section, index) => {
      // Section header
      children.push(
        new Paragraph({
          text: `${index + 1}. ${section.section_title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );

      // Required indicator
      if (section.is_mandatory) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '* Required Section', italics: true, color: 'DC2626', size: 18 })
            ],
            spacing: { after: 100 }
          })
        );
      }

      // Section description
      if (section.section_description) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: section.section_description, italics: true, color: '666666' })
            ],
            spacing: { after: 200 }
          })
        );
      }

      // Section content
      const content = section.content || '[No response provided]';
      const paragraphs = content.split('\n').filter(p => p.trim());

      paragraphs.forEach(para => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: para })
            ],
            spacing: { after: 120 }
          })
        );
      });

      // Add spacing between sections
      children.push(
        new Paragraph({
          text: '',
          spacing: { after: 300 }
        })
      );
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children
      }]
    });

    return await Packer.toBuffer(doc);
  },

  /**
   * Get export preview data
   */
  async getExportPreview(proposalId, template, user) {
    const proposal = await this.getProposalForExport(proposalId, user);
    const config = TEMPLATES[template] || TEMPLATES.formal;

    return {
      title: proposal.tender_title,
      template: config.name,
      templateConfig: config,
      organization: proposal.organization_name,
      tenderOrganization: proposal.tender_organization_name,
      version: proposal.version || 1,
      status: proposal.status,
      sectionCount: proposal.sections.length,
      completedSections: proposal.sections.filter(s => s.content && s.content.trim().length >= 50).length,
      sections: proposal.sections.map(s => ({
        title: s.section_title,
        isMandatory: s.is_mandatory,
        hasContent: !!(s.content && s.content.trim()),
        contentPreview: s.content ? s.content.substring(0, 200) + (s.content.length > 200 ? '...' : '') : null
      })),
      generatedAt: new Date().toISOString()
    };
  }
};
