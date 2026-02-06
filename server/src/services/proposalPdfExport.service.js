/**
 * Professional Proposal PDF Export Service
 * Generates industry-standard tender proposal documents
 * With REAL structural differences between templates
 */

import PDFDocument from 'pdfkit';

/**
 * Template configurations with structural differences
 */
const TEMPLATES = {
  government: {
    name: 'Government Standard',
    description: 'GFR 2017 compliant format with compliance declaration and seal area',
    colors: {
      primary: '#1a365d',
      secondary: '#2d3748',
      accent: '#2563eb',
      headerBg: '#f8fafc',
      tableBorder: '#cbd5e1',
      success: '#059669',
    },
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    // Structure flags
    includeCoverPage: true,
    includeTableOfContents: true,
    includeExecutiveSummary: true,
    includeCompanyProfile: true,
    includeComplianceDeclaration: true,
    includeSealArea: true,
    includeAffidavit: true,
    formalLanguage: true,
  },
  corporate: {
    name: 'Corporate Professional',
    description: 'Modern business style with branding focus',
    colors: {
      primary: '#0f172a',
      secondary: '#334155',
      accent: '#6366f1',
      headerBg: '#f1f5f9',
      tableBorder: '#e2e8f0',
      success: '#10b981',
    },
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    // Structure flags
    includeCoverPage: true,
    includeTableOfContents: true,
    includeExecutiveSummary: true,
    includeCompanyProfile: true,
    includeComplianceDeclaration: false,
    includeSealArea: false,
    includeAffidavit: false,
    formalLanguage: false,
    includeValueProposition: true,
    includeWhyChooseUs: true,
  },
  minimal: {
    name: 'Minimal Clean',
    description: 'Straight to content - no cover page, just essentials',
    colors: {
      primary: '#111827',
      secondary: '#4b5563',
      accent: '#3b82f6',
      headerBg: '#fafafa',
      tableBorder: '#d1d5db',
      success: '#22c55e',
    },
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    // Structure flags - minimal has no extra pages
    includeCoverPage: false,
    includeTableOfContents: false,
    includeExecutiveSummary: false,
    includeCompanyProfile: false,
    includeComplianceDeclaration: false,
    includeSealArea: false,
    includeAffidavit: false,
    formalLanguage: false,
    minimalHeader: true,
  },
};

export const ProposalPdfExportService = {
  /**
   * Generate a professional tender proposal PDF
   */
  async generateProposalPDF(proposalData, tenderInfo, companyInfo, templateId = 'government') {
    const config = TEMPLATES[templateId] || TEMPLATES.government;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: config.margins,
          bufferPages: true,
          info: {
            Title: `Proposal - ${tenderInfo.title}`,
            Author: companyInfo.name || 'Bidder',
            Subject: 'Tender Proposal Document',
            Creator: 'TenderFlow AI',
          },
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - config.margins.left - config.margins.right;

        // ==========================================
        // TEMPLATE-SPECIFIC RENDERING
        // ==========================================

        if (templateId === 'minimal') {
          // MINIMAL: No cover, straight to content
          this._renderMinimalDocument(doc, config, proposalData, tenderInfo, companyInfo, pageWidth);
        } else if (templateId === 'corporate') {
          // CORPORATE: Modern business style
          this._renderCorporateDocument(doc, config, proposalData, tenderInfo, companyInfo, pageWidth);
        } else {
          // GOVERNMENT: Full formal structure
          this._renderGovernmentDocument(doc, config, proposalData, tenderInfo, companyInfo, pageWidth);
        }

        // Add footers to all pages
        this._addFooters(doc, config, tenderInfo, templateId);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * GOVERNMENT TEMPLATE - Full formal structure
   */
  _renderGovernmentDocument(doc, config, proposalData, tenderInfo, companyInfo, pageWidth) {
    // Cover Page
    this._renderGovernmentCoverPage(doc, config, tenderInfo, companyInfo, pageWidth);

    // Table of Contents
    doc.addPage();
    this._renderTableOfContents(doc, config, proposalData.sections, pageWidth, true);

    // Executive Summary
    if (tenderInfo.executiveSummary) {
      doc.addPage();
      this._renderExecutiveSummary(doc, config, tenderInfo, pageWidth);
    }

    // Company Profile with full details
    doc.addPage();
    this._renderGovernmentCompanyProfile(doc, config, companyInfo, pageWidth);

    // Proposal Sections
    proposalData.sections.forEach((section, index) => {
      doc.addPage();
      this._renderProposalSection(doc, config, section, index + 1, pageWidth, true);
    });

    // Compliance Declaration (Government only)
    doc.addPage();
    this._renderComplianceDeclaration(doc, config, tenderInfo, companyInfo, pageWidth);

    // Affidavit Page (Government only)
    doc.addPage();
    this._renderAffidavit(doc, config, companyInfo, pageWidth);
  },

  /**
   * CORPORATE TEMPLATE - Modern business style
   */
  _renderCorporateDocument(doc, config, proposalData, tenderInfo, companyInfo, pageWidth) {
    // Modern Cover Page
    this._renderCorporateCoverPage(doc, config, tenderInfo, companyInfo, pageWidth);

    // Value Proposition (Corporate only)
    doc.addPage();
    this._renderValueProposition(doc, config, tenderInfo, companyInfo, pageWidth);

    // Brief Company Overview (not full profile)
    doc.addPage();
    this._renderCorporateCompanyOverview(doc, config, companyInfo, pageWidth);

    // Proposal Sections with modern styling
    proposalData.sections.forEach((section, index) => {
      doc.addPage();
      this._renderProposalSection(doc, config, section, index + 1, pageWidth, false);
    });

    // Why Choose Us (Corporate only)
    doc.addPage();
    this._renderWhyChooseUs(doc, config, companyInfo, pageWidth);
  },

  /**
   * MINIMAL TEMPLATE - Straight to content
   */
  _renderMinimalDocument(doc, config, proposalData, tenderInfo, companyInfo, pageWidth) {
    // Simple header on first page (no cover)
    this._renderMinimalHeader(doc, config, tenderInfo, companyInfo, pageWidth);

    // Jump straight to content
    doc.moveDown(2);

    // Brief intro paragraph
    if (tenderInfo.executiveSummary) {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(config.colors.secondary)
         .text(tenderInfo.executiveSummary.substring(0, 500) + '...', {
           align: 'justify',
           lineGap: 3,
         });
      doc.moveDown(1.5);
    }

    // Render all sections continuously (no page breaks between)
    proposalData.sections.forEach((section, index) => {
      this._renderMinimalSection(doc, config, section, index + 1, pageWidth);
    });

    // Simple signature at end
    doc.moveDown(2);
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(companyInfo.name || '[BIDDER NAME]');
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }));
  },

  /**
   * Government Cover Page - Formal with CONFIDENTIAL banner
   */
  _renderGovernmentCoverPage(doc, config, tenderInfo, companyInfo, pageWidth) {
    const centerX = config.margins.left + pageWidth / 2;

    // Top banner
    doc.rect(0, 0, doc.page.width, 100).fill(config.colors.primary);

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('TENDER PROPOSAL DOCUMENT', config.margins.left, 25, { width: pageWidth, align: 'center' });

    doc.fontSize(8)
       .text('STRICTLY CONFIDENTIAL', config.margins.left, 45, { width: pageWidth, align: 'center' });

    // Reference box
    if (tenderInfo.referenceNumber) {
      doc.rect(centerX - 100, 65, 200, 25).fill('#ffffff');
      doc.fontSize(9)
         .fillColor(config.colors.primary)
         .text(`Ref: ${tenderInfo.referenceNumber}`, centerX - 100, 72, { width: 200, align: 'center' });
    }

    // Main content
    doc.y = 150;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(config.colors.accent)
       .text('TECHNICAL & FINANCIAL BID', { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(tenderInfo.title || 'Tender Proposal', { align: 'center' });

    doc.moveDown(2);

    // Divider
    doc.moveTo(centerX - 80, doc.y).lineTo(centerX + 80, doc.y)
       .strokeColor(config.colors.accent).lineWidth(2).stroke();

    doc.moveDown(2);

    // Submitted To
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(config.colors.secondary)
       .text('SUBMITTED TO:', { align: 'center' });
    doc.fontSize(13)
       .font('Helvetica')
       .fillColor(config.colors.primary)
       .text(tenderInfo.authority || tenderInfo.organizationName || 'Tendering Authority', { align: 'center' });

    doc.moveDown(2);

    // Submitted By
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(config.colors.secondary)
       .text('SUBMITTED BY:', { align: 'center' });
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(companyInfo.name || '[BIDDER NAME]', { align: 'center' });

    if (companyInfo.address) {
      doc.fontSize(9).font('Helvetica').fillColor(config.colors.secondary)
         .text(companyInfo.address, { align: 'center' });
    }

    // Bottom info box
    const boxY = doc.page.height - 150;
    doc.rect(config.margins.left, boxY, pageWidth, 90).fill(config.colors.headerBg);

    doc.fontSize(9).font('Helvetica').fillColor(config.colors.secondary);
    doc.text(`Date of Submission: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, config.margins.left + 15, boxY + 15);

    if (tenderInfo.deadline) {
      doc.text(`Tender Deadline: ${new Date(tenderInfo.deadline).toLocaleDateString('en-IN')}`, config.margins.left + 15, boxY + 35);
    }
    if (tenderInfo.estimatedValue) {
      const value = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tenderInfo.estimatedValue);
      doc.text(`Estimated Value: ${value}`, config.margins.left + 15, boxY + 55);
    }
  },

  /**
   * Corporate Cover Page - Modern business style
   */
  _renderCorporateCoverPage(doc, config, tenderInfo, companyInfo, pageWidth) {
    // Side accent bar
    doc.rect(0, 0, 8, doc.page.height).fill(config.colors.accent);

    // Company name at top right
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(companyInfo.name || 'Your Company', config.margins.left, 50, { align: 'right', width: pageWidth });

    // Main title area
    doc.y = 200;

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(config.colors.accent)
       .text('PROPOSAL FOR', config.margins.left, doc.y);

    doc.moveDown(0.5);

    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(tenderInfo.title || 'Business Proposal', config.margins.left, doc.y, { width: pageWidth });

    doc.moveDown(1);

    // Accent line
    doc.rect(config.margins.left, doc.y, 100, 4).fill(config.colors.accent);

    doc.moveDown(2);

    // Prepared for
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text('Prepared for', config.margins.left);
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(tenderInfo.authority || tenderInfo.organizationName || 'Client Organization');

    doc.moveDown(2);

    // Date
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }));

    // Bottom contact info
    const bottomY = doc.page.height - 100;
    doc.fontSize(9).font('Helvetica').fillColor(config.colors.secondary);
    if (companyInfo.email) doc.text(companyInfo.email, config.margins.left, bottomY);
    if (companyInfo.phone) doc.text(companyInfo.phone, config.margins.left, bottomY + 15);
    if (companyInfo.address) doc.text(companyInfo.address, config.margins.left, bottomY + 30);
  },

  /**
   * Minimal Header - Just title and basic info
   */
  _renderMinimalHeader(doc, config, tenderInfo, companyInfo, pageWidth) {
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(tenderInfo.title || 'Proposal', config.margins.left, config.margins.top);

    doc.moveDown(0.3);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text(`Submitted by ${companyInfo.name || '[Bidder]'} | ${new Date().toLocaleDateString('en-IN')}`);

    // Simple line
    doc.moveDown(0.5);
    doc.moveTo(config.margins.left, doc.y)
       .lineTo(config.margins.left + pageWidth, doc.y)
       .strokeColor(config.colors.tableBorder).lineWidth(1).stroke();
  },

  /**
   * Table of Contents
   */
  _renderTableOfContents(doc, config, sections, pageWidth, formal = true) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(formal ? 'TABLE OF CONTENTS' : 'Contents', { align: formal ? 'center' : 'left' });

    doc.moveDown(1);

    const tocItems = formal ? [
      { title: 'Cover Page', page: 1 },
      { title: 'Table of Contents', page: 2 },
      { title: 'Executive Summary', page: 3 },
      { title: 'Company Profile', page: 4 },
    ] : [];

    sections.forEach((section, idx) => {
      tocItems.push({ title: `${idx + 1}. ${section.title}`, page: (formal ? 5 : 1) + idx });
    });

    if (formal) {
      tocItems.push({ title: 'Compliance Declaration', page: 5 + sections.length });
      tocItems.push({ title: 'Affidavit', page: 6 + sections.length });
    }

    tocItems.forEach((item) => {
      const y = doc.y;
      doc.fontSize(10).font('Helvetica').fillColor(config.colors.secondary)
         .text(item.title, config.margins.left + 20, y);

      doc.text(item.page.toString(), config.margins.left + pageWidth - 30, y, { align: 'right' });
      doc.y = y + 22;
    });
  },

  /**
   * Executive Summary
   */
  _renderExecutiveSummary(doc, config, tenderInfo, pageWidth) {
    this._renderSectionHeader(doc, config, 'EXECUTIVE SUMMARY', pageWidth);
    doc.moveDown(1);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text(tenderInfo.executiveSummary || 'No executive summary provided.', { align: 'justify', lineGap: 4 });

    if (tenderInfo.keyHighlights && tenderInfo.keyHighlights.length > 0) {
      doc.moveDown(1.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(config.colors.primary).text('Key Highlights:');
      doc.moveDown(0.5);

      tenderInfo.keyHighlights.forEach((highlight) => {
        doc.fontSize(10).font('Helvetica')
           .fillColor(config.colors.success).text('  ✓  ', { continued: true })
           .fillColor(config.colors.secondary).text(highlight);
        doc.moveDown(0.3);
      });
    }
  },

  /**
   * Government Company Profile - Full formal details
   */
  _renderGovernmentCompanyProfile(doc, config, companyInfo, pageWidth) {
    this._renderSectionHeader(doc, config, 'COMPANY PROFILE', pageWidth);
    doc.moveDown(1);

    const details = [
      ['Company Name', companyInfo.name || '[BIDDER NAME]'],
      ['Registration Number', companyInfo.registrationNumber || '[REGISTRATION NUMBER]'],
      ['Year of Establishment', companyInfo.yearEstablished || '[YEAR]'],
      ['Type of Organization', companyInfo.organizationType || '[TYPE]'],
      ['Registered Address', companyInfo.address || '[ADDRESS]'],
      ['Contact Person', companyInfo.contactPerson || '[CONTACT PERSON]'],
      ['Email', companyInfo.email || '[EMAIL]'],
      ['Phone', companyInfo.phone || '[PHONE]'],
      ['GST Number', companyInfo.gstNumber || '[GST NUMBER]'],
      ['PAN Number', companyInfo.panNumber || '[PAN NUMBER]'],
    ];

    const tableTop = doc.y;
    const rowHeight = 26;

    details.forEach((row, idx) => {
      const y = tableTop + idx * rowHeight;
      if (idx % 2 === 0) {
        doc.rect(config.margins.left, y, pageWidth, rowHeight).fill(config.colors.headerBg);
      }

      doc.fontSize(9).font('Helvetica-Bold').fillColor(config.colors.secondary)
         .text(row[0], config.margins.left + 10, y + 7, { width: 150 });
      doc.fontSize(9).font('Helvetica').fillColor(config.colors.primary)
         .text(row[1], config.margins.left + 170, y + 7, { width: pageWidth - 180 });

      doc.rect(config.margins.left, y, pageWidth, rowHeight).strokeColor(config.colors.tableBorder).stroke();
    });

    doc.y = tableTop + details.length * rowHeight + 20;
  },

  /**
   * Corporate Company Overview - Brief modern style
   */
  _renderCorporateCompanyOverview(doc, config, companyInfo, pageWidth) {
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text('About Us');

    doc.moveDown(0.5);
    doc.rect(config.margins.left, doc.y, 60, 3).fill(config.colors.accent);
    doc.moveDown(1);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text(companyInfo.experience || `${companyInfo.name || 'Our company'} is a leading provider of professional services. We bring expertise, dedication, and innovative solutions to every project we undertake.`, {
         align: 'justify',
         lineGap: 4,
       });

    doc.moveDown(1.5);

    // Key stats in boxes
    const stats = [
      { label: 'Contact', value: companyInfo.contactPerson || 'Available' },
      { label: 'Email', value: companyInfo.email || 'contact@company.com' },
      { label: 'Phone', value: companyInfo.phone || 'On request' },
    ];

    const boxWidth = (pageWidth - 20) / 3;
    stats.forEach((stat, idx) => {
      const x = config.margins.left + idx * (boxWidth + 10);
      doc.rect(x, doc.y, boxWidth, 50).fill(config.colors.headerBg);
      doc.fontSize(8).font('Helvetica').fillColor(config.colors.secondary).text(stat.label, x + 10, doc.y + 10);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(config.colors.primary).text(stat.value, x + 10, doc.y + 25, { width: boxWidth - 20 });
    });

    doc.y += 60;
  },

  /**
   * Value Proposition (Corporate only)
   */
  _renderValueProposition(doc, config, tenderInfo, companyInfo, pageWidth) {
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text('Our Value Proposition');

    doc.moveDown(0.5);
    doc.rect(config.margins.left, doc.y, 60, 3).fill(config.colors.accent);
    doc.moveDown(1);

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text(`We understand the requirements for "${tenderInfo.title || 'this project'}" and are uniquely positioned to deliver exceptional results.`, {
         align: 'justify',
         lineGap: 4,
       });

    doc.moveDown(1.5);

    const benefits = [
      'Proven track record of successful project delivery',
      'Experienced team with domain expertise',
      'Commitment to quality and timelines',
      'Competitive and transparent pricing',
      'Dedicated support throughout the project lifecycle',
    ];

    benefits.forEach((benefit) => {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(config.colors.accent).text('→  ', { continued: true })
         .fillColor(config.colors.secondary).text(benefit);
      doc.moveDown(0.5);
    });
  },

  /**
   * Why Choose Us (Corporate only)
   */
  _renderWhyChooseUs(doc, config, companyInfo, pageWidth) {
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text('Why Choose Us?');

    doc.moveDown(0.5);
    doc.rect(config.margins.left, doc.y, 60, 3).fill(config.colors.accent);
    doc.moveDown(1);

    const reasons = [
      { title: 'Experience', desc: 'Years of industry expertise delivering complex projects' },
      { title: 'Quality', desc: 'Rigorous quality standards and best practices' },
      { title: 'Innovation', desc: 'Modern approaches and cutting-edge solutions' },
      { title: 'Partnership', desc: 'We work as an extension of your team' },
    ];

    reasons.forEach((reason, idx) => {
      const y = doc.y;
      doc.rect(config.margins.left, y, pageWidth, 50).fill(idx % 2 === 0 ? config.colors.headerBg : '#ffffff');

      doc.fontSize(12).font('Helvetica-Bold').fillColor(config.colors.primary)
         .text(reason.title, config.margins.left + 15, y + 10);
      doc.fontSize(10).font('Helvetica').fillColor(config.colors.secondary)
         .text(reason.desc, config.margins.left + 15, y + 28, { width: pageWidth - 30 });

      doc.y = y + 55;
    });
  },

  /**
   * Proposal Section
   */
  _renderProposalSection(doc, config, section, sectionNumber, pageWidth, formal = true) {
    if (formal) {
      this._renderSectionHeader(doc, config, `SECTION ${sectionNumber}: ${section.title.toUpperCase()}`, pageWidth);
    } else {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor(config.colors.primary)
         .text(`${sectionNumber}. ${section.title}`);
      doc.moveDown(0.3);
      doc.rect(config.margins.left, doc.y, 40, 2).fill(config.colors.accent);
    }

    doc.moveDown(1);

    const content = section.content || '[No content provided]';
    const paragraphs = content.split('\n\n');

    paragraphs.forEach((para) => {
      if (para.trim().startsWith('#')) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(config.colors.primary)
           .text(para.replace(/^#+\s*/, ''));
        doc.moveDown(0.5);
      } else if (para.trim().startsWith('-') || para.trim().startsWith('•')) {
        para.split('\n').forEach((line) => {
          const text = line.replace(/^[-•]\s*/, '');
          if (text.trim()) {
            doc.fontSize(10).font('Helvetica')
               .fillColor(config.colors.accent).text('  •  ', { continued: true })
               .fillColor(config.colors.secondary).text(text);
            doc.moveDown(0.3);
          }
        });
      } else {
        doc.fontSize(10).font('Helvetica').fillColor(config.colors.secondary)
           .text(para.trim(), { align: 'justify', lineGap: 3 });
        doc.moveDown(0.8);
      }

      if (doc.y > doc.page.height - 100) doc.addPage();
    });
  },

  /**
   * Minimal Section - Compact continuous style
   */
  _renderMinimalSection(doc, config, section, sectionNumber, pageWidth) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(config.colors.primary)
       .text(`${sectionNumber}. ${section.title}`);

    doc.moveDown(0.5);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(config.colors.secondary)
       .text(section.content || '[No content]', { align: 'justify', lineGap: 2 });

    doc.moveDown(1.5);

    if (doc.y > doc.page.height - 80) doc.addPage();
  },

  /**
   * Compliance Declaration (Government only)
   */
  _renderComplianceDeclaration(doc, config, tenderInfo, companyInfo, pageWidth) {
    this._renderSectionHeader(doc, config, 'COMPLIANCE DECLARATION', pageWidth);
    doc.moveDown(1);

    const text = `I/We, the undersigned, being duly authorized to represent and act on behalf of ${companyInfo.name || '[BIDDER NAME]'}, do hereby declare:

1. All information provided in this proposal is true, accurate, and complete.

2. We have read and understood all terms and conditions of the tender document for "${tenderInfo.title || 'the referenced tender'}" and agree to comply fully.

3. This proposal shall remain valid for 90 days from submission date.

4. The signatory is duly authorized to bind the Bidder to all commitments herein.

5. We have no conflict of interest that would affect our participation.

6. We have not engaged in any corrupt, fraudulent, or collusive practices.`;

    doc.fontSize(10).font('Helvetica').fillColor(config.colors.secondary)
       .text(text, { align: 'justify', lineGap: 4 });

    doc.moveDown(2);

    // Signature area
    doc.fontSize(10).font('Helvetica').fillColor(config.colors.secondary)
       .text(`For: ${companyInfo.name || '[BIDDER NAME]'}`);

    doc.moveDown(2);
    doc.moveTo(config.margins.left, doc.y).lineTo(config.margins.left + 200, doc.y).stroke();
    doc.moveDown(0.3);
    doc.text('Authorized Signatory');
    doc.text('Name: _________________________');
    doc.text('Designation: _________________________');
    doc.text('Date: _________________________');

    // Seal box
    doc.rect(config.margins.left + pageWidth - 100, doc.y - 80, 80, 80)
       .strokeColor(config.colors.tableBorder).stroke();
    doc.fontSize(8).fillColor(config.colors.accent)
       .text('Company Seal', config.margins.left + pageWidth - 90, doc.y - 45);
  },

  /**
   * Affidavit Page (Government only)
   */
  _renderAffidavit(doc, config, companyInfo, pageWidth) {
    this._renderSectionHeader(doc, config, 'AFFIDAVIT', pageWidth);
    doc.moveDown(1);

    const text = `AFFIDAVIT

I, _________________________ (Name), _________________________ (Designation), of ${companyInfo.name || '[COMPANY NAME]'}, do solemnly affirm and declare as under:

1. That I am authorized to sign this affidavit on behalf of ${companyInfo.name || '[COMPANY NAME]'}.

2. That the company has not been blacklisted by any Central/State Government department or Public Sector Undertaking.

3. That no criminal proceedings are pending against the company or its directors/partners.

4. That all documents submitted are genuine and authentic.

5. That I understand that furnishing false information may result in disqualification and legal action.




DEPONENT



Verified at _____________ on this _____ day of _____________ 20____

Before me,

(Notary Public / First Class Magistrate)`;

    doc.fontSize(10).font('Helvetica').fillColor(config.colors.secondary)
       .text(text, { lineGap: 4 });
  },

  /**
   * Section Header
   */
  _renderSectionHeader(doc, config, title, pageWidth) {
    const y = doc.y;
    doc.rect(config.margins.left, y, pageWidth, 32).fill(config.colors.primary);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
       .text(title, config.margins.left + 15, y + 9);
    doc.y = y + 40;
  },

  /**
   * Add footers
   */
  _addFooters(doc, config, tenderInfo, templateId) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      if (templateId !== 'minimal') {
        doc.moveTo(config.margins.left, doc.page.height - 40)
           .lineTo(doc.page.width - config.margins.right, doc.page.height - 40)
           .strokeColor(config.colors.tableBorder).lineWidth(0.5).stroke();
      }

      doc.fontSize(8).font('Helvetica').fillColor(config.colors.secondary);

      if (templateId === 'minimal') {
        doc.text(`Page ${i + 1}`, config.margins.left, doc.page.height - 30, {
          width: doc.page.width - config.margins.left - config.margins.right,
          align: 'center',
        });
      } else {
        doc.text(`${tenderInfo.title || 'Proposal'} | ${templateId === 'government' ? 'CONFIDENTIAL' : 'Confidential'}`,
          config.margins.left, doc.page.height - 30);
        doc.text(`Page ${i + 1} of ${pages.count}`,
          doc.page.width - config.margins.right - 60, doc.page.height - 30, { width: 60, align: 'right' });
      }
    }
  },

  /**
   * Get available templates
   */
  getTemplates() {
    return Object.entries(TEMPLATES).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
    }));
  },
};
