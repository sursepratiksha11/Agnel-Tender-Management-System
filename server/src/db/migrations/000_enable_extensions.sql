CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- Purpose: Enable required extensions for UUID generation (pgcrypto) and vector embeddings.
-- Key constraints: None; extensions must exist before dependent tables are created.
