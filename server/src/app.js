import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env, loadEnv } from './config/env.js';
import { pool } from './config/db.js';

// Load environment variables
loadEnv();

// Run migrations on startup
async function runMigrations() {
  try {
    // Add missing columns to tender_section if they don't exist
    await pool.query(`
      ALTER TABLE tender_section
      ADD COLUMN IF NOT EXISTS content TEXT,
      ADD COLUMN IF NOT EXISTS section_key VARCHAR(100),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
    console.log('[DB] Migration: Added missing columns to tender_section');

    // Create uploaded_tender table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_tender (
        uploaded_tender_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        source TEXT CHECK (source IN ('PDF_UPLOAD', 'URL')) DEFAULT 'PDF_UPLOAD',
        source_url TEXT,
        original_filename TEXT,
        file_size INTEGER,
        parsed_data JSONB,
        analysis_data JSONB,
        authority_name TEXT,
        reference_number TEXT,
        sector TEXT,
        estimated_value DECIMAL(15, 2),
        submission_deadline TIMESTAMP,
        emd_amount DECIMAL(15, 2),
        word_count INTEGER DEFAULT 0,
        section_count INTEGER DEFAULT 0,
        opportunity_score INTEGER DEFAULT 0,
        status TEXT CHECK (status IN ('ANALYZING', 'ANALYZED', 'FAILED')) DEFAULT 'ANALYZING',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        analyzed_at TIMESTAMP
      );
    `);
    
    // Create indexes for uploaded_tender
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_tender_organization ON uploaded_tender(organization_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_tender_user ON uploaded_tender(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_tender_status ON uploaded_tender(status);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_tender_created ON uploaded_tender(created_at DESC);
    `);
    
    console.log('[DB] Migration: Created uploaded_tender table if not exists');

    // Create saved_tender table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_tender (
        saved_tender_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
        tender_id UUID REFERENCES tender(tender_id) ON DELETE CASCADE,
        uploaded_tender_id UUID REFERENCES uploaded_tender(uploaded_tender_id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT check_tender_reference CHECK (
          (tender_id IS NOT NULL AND uploaded_tender_id IS NULL) OR
          (tender_id IS NULL AND uploaded_tender_id IS NOT NULL)
        ),
        CONSTRAINT unique_user_tender UNIQUE (user_id, tender_id),
        CONSTRAINT unique_user_uploaded_tender UNIQUE (user_id, uploaded_tender_id)
      );
    `);
    
    // Create indexes for saved_tender
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_tender_user ON saved_tender(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_tender_organization ON saved_tender(organization_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_tender_tender ON saved_tender(tender_id) WHERE tender_id IS NOT NULL;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_tender_uploaded ON saved_tender(uploaded_tender_id) WHERE uploaded_tender_id IS NOT NULL;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_tender_saved_at ON saved_tender(saved_at DESC);
    `);
    
    console.log('[DB] Migration: Created saved_tender table if not exists');

    // Create uploaded_proposal_draft table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_proposal_draft (
        draft_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploaded_tender_id UUID NOT NULL REFERENCES uploaded_tender(uploaded_tender_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
        sections JSONB NOT NULL DEFAULT '[]',
        status TEXT CHECK (status IN ('DRAFT', 'FINAL', 'EXPORTED')) DEFAULT 'DRAFT',
        title TEXT,
        total_sections INTEGER DEFAULT 0,
        total_words INTEGER DEFAULT 0,
        completion_percent INTEGER DEFAULT 0,
        last_exported_at TIMESTAMP,
        export_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_user_uploaded_tender_draft UNIQUE (user_id, uploaded_tender_id)
      );
    `);
    
    // Create indexes for uploaded_proposal_draft
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_user ON uploaded_proposal_draft(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_org ON uploaded_proposal_draft(organization_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_tender ON uploaded_proposal_draft(uploaded_tender_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_status ON uploaded_proposal_draft(status);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_updated ON uploaded_proposal_draft(updated_at DESC);
    `);
    
    console.log('[DB] Migration: Created uploaded_proposal_draft table if not exists');

    // Create proposal_collaborator table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proposal_collaborator (
        collaborator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
        section_id UUID NOT NULL REFERENCES tender_section(section_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'READ_AND_COMMENT')),
        assigned_by UUID NOT NULL REFERENCES "user"(user_id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (proposal_id, section_id, user_id)
      );
    `);
    
    // Create indexes for proposal_collaborator
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collaborator_proposal ON proposal_collaborator(proposal_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collaborator_user ON proposal_collaborator(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collaborator_section ON proposal_collaborator(section_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collaborator_lookup ON proposal_collaborator(proposal_id, user_id);
    `);
    
    console.log('[DB] Migration: Created proposal_collaborator table if not exists');

    // Create proposal_comment table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proposal_comment (
        comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
        section_id UUID NOT NULL REFERENCES tender_section(section_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_comment_id UUID REFERENCES proposal_comment(comment_id) ON DELETE CASCADE,
        selection_start INTEGER,
        selection_end INTEGER,
        quoted_text TEXT,
        is_resolved BOOLEAN DEFAULT false,
        resolved_by UUID REFERENCES "user"(user_id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes for proposal_comment
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_proposal ON proposal_comment(proposal_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_section ON proposal_comment(proposal_id, section_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_thread ON proposal_comment(parent_comment_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_user ON proposal_comment(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_unresolved ON proposal_comment(proposal_id, is_resolved) WHERE is_resolved = false;
    `);
    
    console.log('[DB] Migration: Created proposal_comment table if not exists');

    // Create proposal_section_activity table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proposal_section_activity (
        activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
        section_id UUID REFERENCES tender_section(section_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        activity_type TEXT NOT NULL CHECK (activity_type IN ('EDIT', 'AI_DRAFT', 'COMMENT', 'RESOLVE_COMMENT', 'ASSIGN', 'UNASSIGN')),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes for proposal_section_activity
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_proposal ON proposal_section_activity(proposal_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_section ON proposal_section_activity(proposal_id, section_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_user ON proposal_section_activity(user_id);
    `);
    
    console.log('[DB] Migration: Created proposal_section_activity table if not exists');

    // Create uploaded_proposal_collaborator table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_proposal_collaborator (
        collaborator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploaded_tender_id UUID NOT NULL REFERENCES uploaded_tender(uploaded_tender_id) ON DELETE CASCADE,
        section_key TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'READ_AND_COMMENT')),
        assigned_by UUID NOT NULL REFERENCES "user"(user_id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (uploaded_tender_id, section_key, user_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_collaborator_tender ON uploaded_proposal_collaborator(uploaded_tender_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_collaborator_user ON uploaded_proposal_collaborator(user_id);
    `);

    console.log('[DB] Migration: Created uploaded_proposal_collaborator table if not exists');

    // Create uploaded_proposal_comment table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_proposal_comment (
        comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploaded_tender_id UUID NOT NULL REFERENCES uploaded_tender(uploaded_tender_id) ON DELETE CASCADE,
        section_key TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_comment_id UUID REFERENCES uploaded_proposal_comment(comment_id) ON DELETE CASCADE,
        quoted_text TEXT,
        is_resolved BOOLEAN DEFAULT false,
        resolved_by UUID REFERENCES "user"(user_id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_comment_tender ON uploaded_proposal_comment(uploaded_tender_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_uploaded_comment_section ON uploaded_proposal_comment(uploaded_tender_id, section_key);
    `);

    console.log('[DB] Migration: Created uploaded_proposal_comment table if not exists');

  } catch (err) {
    console.error('[DB] Migration error:', err.message);
  }
}

// Run migrations
runMigrations();

// Routes
import authRoutes from './routes/auth.routes.js';
import tenderRoutes from './routes/tender.routes.js';
import aiRoutes from './routes/ai.routes.js';
import proposalRoutes from './routes/proposal.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import bidderRoutes from './routes/bidder.routes.js';
import pdfAnalysisRoutes from './routes/pdfAnalysis.routes.js';
import uploadedTenderRoutes from './routes/uploadedTender.routes.js';
import collaborationRoutes from './routes/collaboration.routes.js';
import reviewerRoutes from './routes/reviewer.routes.js'; // Assister routes
import insightsRoutes from './routes/insights.routes.js';

// Services that need initialization
import { AuditLogService } from './services/auditLog.service.js';

// Error handler
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

const allowedOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser tools
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: env.CORS_ALLOW_CREDENTIALS === 'true',
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Increase JSON body size limit to accommodate analyzed sections payloads
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/bidder', bidderRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pdf', pdfAnalysisRoutes);
app.use('/api/uploaded-tender', uploadedTenderRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/assister', reviewerRoutes); // Assister routes (reuses reviewer route handlers)
app.use('/api/insights', insightsRoutes);

// Initialize audit log table on startup
AuditLogService.initializeTable().catch(err => {
  console.error('[App] Failed to initialize audit log table:', err.message);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use(errorHandler);

export default app;
