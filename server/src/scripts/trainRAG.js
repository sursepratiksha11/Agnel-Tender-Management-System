/**
 * RAG Training Script for Tender Summarizer
 *
 * This script helps you train and improve your RAG (Retrieval Augmented Generation) system
 * for better tender summarization and proposal drafting.
 *
 * Usage:
 *   node src/scripts/trainRAG.js --action=ingest-all
 *   node src/scripts/trainRAG.js --action=ingest-tender --tenderId=<uuid>
 *   node src/scripts/trainRAG.js --action=test-retrieval --query="eligibility requirements"
 *   node src/scripts/trainRAG.js --action=stats
 *   node src/scripts/trainRAG.js --action=clear-embeddings
 *   node src/scripts/trainRAG.js --action=export-training-data
 */

import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

/**
 * Generate embeddings using OpenAI API
 */
async function generateEmbedding(text) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding API failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data?.data?.[0]?.embedding;
}

/**
 * Enhanced chunking with overlap and metadata
 */
function chunkTextWithOverlap(text, metadata = {}) {
  if (!text || !text.trim()) return [];

  const words = text.trim().split(/\s+/);
  const chunks = [];
  let startIdx = 0;

  while (startIdx < words.length) {
    const endIdx = Math.min(startIdx + CHUNK_SIZE, words.length);
    const chunkWords = words.slice(startIdx, endIdx);

    chunks.push({
      content: chunkWords.join(' '),
      metadata: {
        ...metadata,
        chunkIndex: chunks.length,
        startWord: startIdx,
        endWord: endIdx,
        wordCount: chunkWords.length,
      },
    });

    // Move start with overlap
    startIdx = endIdx - CHUNK_OVERLAP;
    if (startIdx >= words.length - CHUNK_OVERLAP) break;
  }

  return chunks;
}

/**
 * Infer section type from title
 */
function inferSectionType(title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('eligib') || titleLower.includes('qualif')) return 'ELIGIBILITY';
  if (titleLower.includes('technic') || titleLower.includes('method') || titleLower.includes('scope')) return 'TECHNICAL';
  if (titleLower.includes('financ') || titleLower.includes('price') || titleLower.includes('cost')) return 'FINANCIAL';
  if (titleLower.includes('evalua') || titleLower.includes('criteria') || titleLower.includes('score')) return 'EVALUATION';
  if (titleLower.includes('term') || titleLower.includes('condition') || titleLower.includes('legal')) return 'TERMS';

  return 'GENERAL';
}

/**
 * Ingest a single tender into the RAG system
 */
async function ingestTender(tenderId) {
  console.log(`\n📄 Ingesting tender: ${tenderId}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get tender details
    const tenderRes = await client.query(
      `SELECT t.tender_id, t.title, t.description, t.sector, t.tender_type, t.status,
              o.name as organization_name
       FROM tender t
       LEFT JOIN organization o ON t.organization_id = o.organization_id
       WHERE t.tender_id = $1`,
      [tenderId]
    );

    if (tenderRes.rows.length === 0) {
      throw new Error('Tender not found');
    }

    const tender = tenderRes.rows[0];

    if (tender.status !== 'PUBLISHED') {
      console.log(`  ⏭️  Skipping: not published (status: ${tender.status})`);
      await client.query('ROLLBACK');
      return { skipped: true, reason: 'not published' };
    }

    // Get sections
    const sectionsRes = await client.query(
      `SELECT section_id, title, content, description, is_mandatory, order_index
       FROM tender_section
       WHERE tender_id = $1
       ORDER BY order_index ASC`,
      [tenderId]
    );

    const sections = sectionsRes.rows;

    // Delete existing embeddings
    await client.query(
      'DELETE FROM tender_content_chunk WHERE tender_id = $1',
      [tenderId]
    );

    let chunkCount = 0;

    // Process tender overview
    const overviewText = `${tender.title}\n\n${tender.description || ''}`.trim();
    if (overviewText.length > 50) {
      const overviewChunks = chunkTextWithOverlap(overviewText, {
        tenderId,
        sectionType: 'OVERVIEW',
        sector: tender.sector,
        tenderType: tender.tender_type,
        isMandatory: true,
      });

      for (const chunk of overviewChunks) {
        const embedding = await generateEmbedding(chunk.content);
        await client.query(
          `INSERT INTO tender_content_chunk (tender_id, section_id, content, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [tenderId, null, chunk.content, embedding]
        );
        chunkCount++;
      }
    }

    // Process each section
    for (const section of sections) {
      const sectionContent = (section.content || section.description || '').trim();
      if (sectionContent.length < 30) continue;

      const sectionText = `${section.title}\n\n${sectionContent}`;
      const sectionType = inferSectionType(section.title);

      const sectionChunks = chunkTextWithOverlap(sectionText, {
        tenderId,
        sectionId: section.section_id,
        sectionType,
        sectionTitle: section.title,
        isMandatory: section.is_mandatory,
        sector: tender.sector,
      });

      for (const chunk of sectionChunks) {
        const embedding = await generateEmbedding(chunk.content);
        await client.query(
          `INSERT INTO tender_content_chunk (tender_id, section_id, content, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [tenderId, section.section_id, chunk.content, embedding]
        );
        chunkCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await client.query('COMMIT');
    console.log(`  ✅ Ingested ${chunkCount} chunks for "${tender.title}"`);

    return { success: true, chunkCount, tenderTitle: tender.title };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ❌ Error: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Ingest all published tenders
 */
async function ingestAllTenders() {
  console.log('🚀 Starting RAG ingestion for all published tenders...\n');

  const tendersRes = await pool.query(
    `SELECT tender_id FROM tender WHERE status = 'PUBLISHED' ORDER BY created_at DESC`
  );

  const tenders = tendersRes.rows;
  console.log(`Found ${tenders.length} published tenders\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let totalChunks = 0;

  for (let i = 0; i < tenders.length; i++) {
    console.log(`[${i + 1}/${tenders.length}]`);
    const result = await ingestTender(tenders[i].tender_id);

    if (result.success) {
      successCount++;
      totalChunks += result.chunkCount;
    } else if (result.skipped) {
      skipCount++;
    } else {
      errorCount++;
    }

    // Delay between tenders
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Ingestion Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total chunks: ${totalChunks}`);
  console.log('='.repeat(50));
}

/**
 * Test retrieval with a query
 */
async function testRetrieval(query, limit = 5) {
  console.log(`\n🔍 Testing retrieval for: "${query}"\n`);

  try {
    const embedding = await generateEmbedding(query);

    const res = await pool.query(
      `SELECT tcc.content, tcc.tender_id, t.title as tender_title,
              ts.title as section_title,
              1 - (tcc.embedding <-> $1::vector) as similarity
       FROM tender_content_chunk tcc
       JOIN tender t ON tcc.tender_id = t.tender_id
       LEFT JOIN tender_section ts ON tcc.section_id = ts.section_id
       ORDER BY tcc.embedding <-> $1::vector
       LIMIT $2`,
      [embedding, limit]
    );

    console.log(`Found ${res.rows.length} results:\n`);

    res.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. [Similarity: ${(row.similarity * 100).toFixed(1)}%]`);
      console.log(`   Tender: ${row.tender_title}`);
      console.log(`   Section: ${row.section_title || 'Overview'}`);
      console.log(`   Content: ${row.content.substring(0, 150)}...`);
      console.log();
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

/**
 * Get RAG statistics
 */
async function getStats() {
  console.log('\n📊 RAG System Statistics\n');

  const stats = await pool.query(`
    SELECT
      COUNT(*) as total_chunks,
      COUNT(DISTINCT tender_id) as tenders_indexed,
      AVG(LENGTH(content)) as avg_chunk_length
    FROM tender_content_chunk
  `);

  const tenderStats = await pool.query(`
    SELECT t.status, COUNT(*) as count
    FROM tender t
    GROUP BY t.status
  `);

  const topTenders = await pool.query(`
    SELECT t.title, COUNT(tcc.chunk_id) as chunk_count
    FROM tender t
    JOIN tender_content_chunk tcc ON t.tender_id = tcc.tender_id
    GROUP BY t.tender_id, t.title
    ORDER BY chunk_count DESC
    LIMIT 5
  `);

  console.log('Embedding Statistics:');
  console.log(`  Total chunks: ${stats.rows[0].total_chunks}`);
  console.log(`  Tenders indexed: ${stats.rows[0].tenders_indexed}`);
  console.log(`  Avg chunk length: ${Math.round(stats.rows[0].avg_chunk_length || 0)} chars`);
  console.log();

  console.log('Tender Status Distribution:');
  tenderStats.rows.forEach(row => {
    console.log(`  ${row.status}: ${row.count}`);
  });
  console.log();

  console.log('Top Indexed Tenders (by chunk count):');
  topTenders.rows.forEach((row, idx) => {
    console.log(`  ${idx + 1}. ${row.title} (${row.chunk_count} chunks)`);
  });
}

/**
 * Clear all embeddings
 */
async function clearEmbeddings() {
  console.log('\n⚠️  Clearing all embeddings...');

  const result = await pool.query('DELETE FROM tender_content_chunk');
  console.log(`✅ Deleted ${result.rowCount} chunks`);
}

/**
 * Export training data for fine-tuning
 */
async function exportTrainingData() {
  console.log('\n📤 Exporting training data...\n');

  // Export tender Q&A pairs
  const tenders = await pool.query(`
    SELECT t.tender_id, t.title, t.description, t.sector,
           array_agg(json_build_object(
             'title', ts.title,
             'content', ts.content,
             'is_mandatory', ts.is_mandatory
           ) ORDER BY ts.order_index) as sections
    FROM tender t
    LEFT JOIN tender_section ts ON t.tender_id = ts.tender_id
    WHERE t.status = 'PUBLISHED'
    GROUP BY t.tender_id, t.title, t.description, t.sector
  `);

  const trainingData = [];

  for (const tender of tenders.rows) {
    // Generate Q&A pairs for each tender
    const sections = tender.sections.filter(s => s.title);

    // General tender questions
    trainingData.push({
      type: 'qa',
      tender_id: tender.tender_id,
      question: `What is this tender about?`,
      context: `${tender.title}\n\n${tender.description || ''}`,
      answer: `This tender is for "${tender.title}". ${tender.description?.substring(0, 200) || ''}`,
    });

    // Section-specific questions
    for (const section of sections) {
      if (section.content && section.content.length > 50) {
        trainingData.push({
          type: 'section_qa',
          tender_id: tender.tender_id,
          section_title: section.title,
          question: `What are the requirements for ${section.title}?`,
          context: section.content,
          answer: section.content.substring(0, 500),
        });
      }
    }
  }

  // Save to file
  const outputDir = path.join(process.cwd(), 'training_data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `training_data_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(trainingData, null, 2));

  console.log(`✅ Exported ${trainingData.length} training examples to:`);
  console.log(`   ${outputPath}`);

  // Also export as JSONL for fine-tuning
  const jsonlPath = path.join(outputDir, `training_data_${Date.now()}.jsonl`);
  const jsonlContent = trainingData.map(item => JSON.stringify({
    messages: [
      { role: 'system', content: 'You are a tender analysis assistant.' },
      { role: 'user', content: item.question },
      { role: 'assistant', content: item.answer },
    ]
  })).join('\n');
  fs.writeFileSync(jsonlPath, jsonlContent);

  console.log(`   ${jsonlPath} (JSONL format for fine-tuning)`);
}

/**
 * Generate synthetic training pairs
 */
async function generateSyntheticPairs() {
  console.log('\n🤖 Generating synthetic training pairs...\n');

  const tenders = await pool.query(`
    SELECT t.tender_id, t.title, t.description
    FROM tender t
    WHERE t.status = 'PUBLISHED'
    LIMIT 10
  `);

  const syntheticPairs = [];

  // Similarity pairs (same sector = similar)
  const sectorTenders = await pool.query(`
    SELECT t1.tender_id as id1, t1.title as title1, t1.description as desc1,
           t2.tender_id as id2, t2.title as title2, t2.description as desc2,
           t1.sector
    FROM tender t1
    JOIN tender t2 ON t1.sector = t2.sector AND t1.tender_id != t2.tender_id
    WHERE t1.status = 'PUBLISHED' AND t2.status = 'PUBLISHED'
    LIMIT 50
  `);

  for (const pair of sectorTenders.rows) {
    syntheticPairs.push({
      type: 'similarity',
      text_a: `${pair.title1}\n${pair.desc1 || ''}`.substring(0, 500),
      text_b: `${pair.title2}\n${pair.desc2 || ''}`.substring(0, 500),
      similarity: 0.7, // Same sector = moderately similar
      sector: pair.sector,
    });
  }

  // Save synthetic pairs
  const outputDir = path.join(process.cwd(), 'training_data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `synthetic_pairs_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(syntheticPairs, null, 2));

  console.log(`✅ Generated ${syntheticPairs.length} synthetic pairs`);
  console.log(`   Saved to: ${outputPath}`);
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const params = {};

  for (const arg of args) {
    const [key, value] = arg.replace('--', '').split('=');
    params[key] = value;
  }

  const action = params.action;

  console.log('🧠 RAG Training System for Tender Summarizer');
  console.log('='.repeat(50));

  switch (action) {
    case 'ingest-all':
      await ingestAllTenders();
      break;

    case 'ingest-tender':
      if (!params.tenderId) {
        console.error('Error: --tenderId is required');
        process.exit(1);
      }
      await ingestTender(params.tenderId);
      break;

    case 'test-retrieval':
      if (!params.query) {
        console.error('Error: --query is required');
        process.exit(1);
      }
      await testRetrieval(params.query, parseInt(params.limit) || 5);
      break;

    case 'stats':
      await getStats();
      break;

    case 'clear-embeddings':
      await clearEmbeddings();
      break;

    case 'export-training-data':
      await exportTrainingData();
      break;

    case 'generate-synthetic':
      await generateSyntheticPairs();
      break;

    default:
      console.log(`
Usage:
  node src/scripts/trainRAG.js --action=<action> [options]

Actions:
  ingest-all           Ingest all published tenders into RAG system
  ingest-tender        Ingest a specific tender (requires --tenderId)
  test-retrieval       Test retrieval with a query (requires --query)
  stats                Show RAG system statistics
  clear-embeddings     Clear all embeddings (use with caution!)
  export-training-data Export Q&A pairs for fine-tuning
  generate-synthetic   Generate synthetic similarity pairs

Examples:
  node src/scripts/trainRAG.js --action=ingest-all
  node src/scripts/trainRAG.js --action=ingest-tender --tenderId=abc-123
  node src/scripts/trainRAG.js --action=test-retrieval --query="eligibility requirements"
  node src/scripts/trainRAG.js --action=stats
`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
