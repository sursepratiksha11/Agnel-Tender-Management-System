/**
 * PDF Parser Service
 * Extracts text from uploaded PDF files and structures it for AI analysis
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import { env } from '../config/env.js';

/**
 * Parse PDF buffer and extract text using pdf-parse v1 API
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<{text: string, numpages: number, info: Object}>}
 */
async function parsePDFBuffer(buffer) {
  const data = await pdfParse(buffer);
  return {
    text: data.text || '',
    numpages: data.numpages || 0,
    info: data.info || {},
  };
}

/**
 * Section type inference from content
 */
function inferSectionType(text) {
  const textLower = text.toLowerCase();

  if (textLower.match(/eligib|qualif|pre-qualification|bidder.*requirement/)) {
    return 'ELIGIBILITY';
  }
  if (textLower.match(/technic|method|scope|specification|deliverable/)) {
    return 'TECHNICAL';
  }
  if (textLower.match(/financ|price|cost|payment|emd|earnest.*money|bid.*security/)) {
    return 'FINANCIAL';
  }
  if (textLower.match(/evalua|criteria|score|marking|selection/)) {
    return 'EVALUATION';
  }
  if (textLower.match(/term|condition|legal|general|penalty|warranty/)) {
    return 'TERMS';
  }
  return 'GENERAL';
}

/**
 * Extract potential sections from PDF text
 */
function extractSections(text) {
  const sections = [];

  // Common section header patterns in government tenders
  const sectionPatterns = [
    /(?:^|\n)(?:section|chapter|part|schedule)\s*[-:]?\s*(\d+|[a-z]|[ivx]+)[.:)]\s*(.+?)(?=\n)/gi,
    /(?:^|\n)(\d+\.?\d*)\s+([A-Z][A-Z\s&]+)(?=\n)/gm,
    /(?:^|\n)(eligibility|technical|financial|evaluation|terms|scope|payment|penalty|warranty|emd|documents)/gi,
  ];

  // Split by common section indicators
  const lines = text.split('\n');
  let currentSection = { title: 'Overview', content: '', type: 'OVERVIEW' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this line looks like a section header
    const isHeader = (
      /^(\d+\.?\d*\.?\d*)\s+[A-Z]/.test(line) ||
      /^(section|chapter|part|schedule)\s/i.test(line) ||
      /^(eligibility|technical|financial|evaluation|terms|scope|payment|penalty|warranty|general conditions)/i.test(line) ||
      (line.length < 80 && line === line.toUpperCase() && line.length > 3)
    );

    if (isHeader && currentSection.content.length > 50) {
      // Save previous section
      sections.push({
        ...currentSection,
        type: inferSectionType(currentSection.content)
      });

      // Start new section
      currentSection = {
        title: line.replace(/^\d+\.?\d*\.?\d*\s*/, '').trim(),
        content: '',
        type: 'GENERAL'
      };
    } else {
      currentSection.content += line + '\n';
    }
  }

  // Don't forget the last section
  if (currentSection.content.length > 50) {
    sections.push({
      ...currentSection,
      type: inferSectionType(currentSection.content)
    });
  }

  // If no sections were found, create a single section from all content
  if (sections.length === 0) {
    sections.push({
      title: 'Tender Document',
      content: text,
      type: 'GENERAL'
    });
  }

  return sections;
}

/**
 * Extract key metadata from tender text
 */
function extractMetadata(text) {
  const metadata = {
    referenceNumber: null,
    deadline: null,
    estimatedValue: null,
    emdAmount: null,
    authority: null,
    sector: null,
  };

  // Reference number patterns
  const refPatterns = [
    /(?:tender|ref|reference|nit|enquiry)\s*(?:no|number|#)?[.:]\s*([A-Z0-9\-\/]+)/i,
    /(?:notice\s+inviting\s+tender|nit)\s*(?:no)?[.:]\s*([A-Z0-9\-\/]+)/i,
  ];

  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.referenceNumber = match[1].trim();
      break;
    }
  }

  // Deadline patterns
  const deadlinePatterns = [
    /(?:last\s+date|due\s+date|deadline|submission.*date|closing\s+date)[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /(?:last\s+date|due\s+date|deadline|submission.*date|closing\s+date)[:\s]+(\d{1,2}\s+\w+\s+\d{2,4})/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.deadline = match[1].trim();
      break;
    }
  }

  // Estimated value patterns
  const valuePatterns = [
    /(?:estimated|approximate|tentative)?\s*(?:cost|value|amount)[:\s]+(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:crore|cr|lakh|lac|l)?/i,
    /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:crore|cr|lakh|lac)/i,
  ];

  for (const pattern of valuePatterns) {
    const match = text.match(pattern);
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const fullMatch = match[0].toLowerCase();
      if (fullMatch.includes('crore') || fullMatch.includes('cr')) {
        value *= 10000000;
      } else if (fullMatch.includes('lakh') || fullMatch.includes('lac')) {
        value *= 100000;
      }
      metadata.estimatedValue = value;
      break;
    }
  }

  // EMD amount
  const emdPatterns = [
    /(?:emd|earnest\s+money)[:\s]+(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d+)?)/i,
    /(?:bid\s+security)[:\s]+(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d+)?)/i,
  ];

  for (const pattern of emdPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.emdAmount = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Authority name
  const authorityPatterns = [
    /(?:issued\s+by|published\s+by|authority|department|organization)[:\s]+([A-Z][A-Za-z\s&,]+?)(?:\n|,|$)/i,
    /(?:government\s+of|ministry\s+of|department\s+of)\s+([A-Za-z\s]+)/i,
  ];

  for (const pattern of authorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.authority = match[1].trim().substring(0, 100);
      break;
    }
  }

  // Infer sector from content
  const textLower = text.toLowerCase();
  if (textLower.includes('construction') || textLower.includes('civil') || textLower.includes('building')) {
    metadata.sector = 'CONSTRUCTION';
  } else if (textLower.includes('software') || textLower.includes('it ') || textLower.includes('technology')) {
    metadata.sector = 'IT';
  } else if (textLower.includes('healthcare') || textLower.includes('medical') || textLower.includes('hospital')) {
    metadata.sector = 'HEALTHCARE';
  } else if (textLower.includes('education') || textLower.includes('school') || textLower.includes('university')) {
    metadata.sector = 'EDUCATION';
  } else if (textLower.includes('transport') || textLower.includes('road') || textLower.includes('highway')) {
    metadata.sector = 'INFRASTRUCTURE';
  }

  return metadata;
}

/**
 * Calculate word count and other stats
 */
function calculateStats(text, sections) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  return {
    totalWords: words.length,
    totalCharacters: text.length,
    totalSentences: sentences.length,
    totalSections: sections.length,
    estimatedReadTime: Math.ceil(words.length / 200), // 200 words per minute
    pageCount: Math.ceil(text.length / 3000), // Approximate pages
  };
}

export const PDFParserService = {
  /**
   * Parse PDF buffer and extract structured content
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Parsed tender data
   */
  async parsePDF(pdfBuffer, filename = 'tender.pdf') {
    try {
      // Parse PDF
      const data = await parsePDFBuffer(pdfBuffer);
      const text = data.text || '';

      if (!text || text.trim().length < 100) {
        throw new Error('PDF appears to be empty or contains no extractable text. It may be scanned/image-based.');
      }

      // Extract sections
      const sections = extractSections(text);

      // Extract metadata
      const metadata = extractMetadata(text);

      // Calculate stats
      const stats = calculateStats(text, sections);

      // Generate title from filename or first line
      let title = filename.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      const firstLine = text.split('\n').find(line => line.trim().length > 10);
      if (firstLine && firstLine.length < 150) {
        title = firstLine.trim();
      }

      return {
        success: true,
        filename,
        title,
        fullText: text,
        sections: sections.map((s, idx) => ({
          id: `section-${idx + 1}`,
          title: s.title,
          content: s.content.trim(),
          type: s.type,
          wordCount: s.content.split(/\s+/).filter(w => w).length,
          isMandatory: s.type !== 'GENERAL' && s.type !== 'OVERVIEW',
        })),
        metadata,
        stats,
        pdfInfo: {
          pageCount: data.numpages,
          pdfVersion: data.info?.PDFFormatVersion,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
        },
        extractedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('PDF parsing error:', err);
      return {
        success: false,
        error: err.message || 'Failed to parse PDF',
        filename,
      };
    }
  },

  /**
   * Extract text only (for quick processing)
   * @param {Buffer} pdfBuffer
   * @returns {Promise<string>}
   */
  async extractText(pdfBuffer) {
    const data = await parsePDFBuffer(pdfBuffer);
    return data.text || '';
  },
};
