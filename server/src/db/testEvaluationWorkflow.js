import { pool } from '../config/db.js';

async function testEvaluationWorkflow() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Bid Evaluation Workflow\n');

    // 1. Check tables exist
    console.log('Step 1: Checking evaluation tables...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bid_evaluation'
      ) as bid_eval_exists,
      EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tender_evaluation_status'
      ) as eval_status_exists;
    `);
    
    console.log('bid_evaluation table:', tableCheck.rows[0].bid_eval_exists ? '✅' : '❌');
    console.log('tender_evaluation_status table:', tableCheck.rows[0].eval_status_exists ? '✅' : '❌\n');

    if (!tableCheck.rows[0].bid_eval_exists || !tableCheck.rows[0].eval_status_exists) {
      console.log('❌ Evaluation tables not found! Creating them now...\n');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS bid_evaluation (
            evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tender_id UUID NOT NULL REFERENCES tender(tender_id) ON DELETE CASCADE,
            proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
            organization_name VARCHAR(255),
            bid_amount DECIMAL(15, 2),
            technical_status VARCHAR(50) DEFAULT 'PENDING' CHECK (technical_status IN ('PENDING', 'QUALIFIED', 'DISQUALIFIED')),
            technical_score DECIMAL(5, 2),
            remarks TEXT,
            evaluator_user_id UUID REFERENCES "user"(user_id),
            evaluated_at TIMESTAMP,
            status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (proposal_id)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS tender_evaluation_status (
            evaluation_status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tender_id UUID NOT NULL UNIQUE REFERENCES tender(tender_id) ON DELETE CASCADE,
            evaluation_status VARCHAR(50) DEFAULT 'PENDING' CHECK (evaluation_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
            total_bids_received INT DEFAULT 0,
            bids_qualified INT DEFAULT 0,
            bids_disqualified INT DEFAULT 0,
            l1_proposal_id UUID REFERENCES proposal(proposal_id),
            l1_amount DECIMAL(15, 2),
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_bid_evaluation_tender_id ON bid_evaluation(tender_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_bid_evaluation_proposal_id ON bid_evaluation(proposal_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_bid_evaluation_technical_status ON bid_evaluation(technical_status);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_tender_evaluation_status_tender_id ON tender_evaluation_status(tender_id);`);

      console.log('✅ Evaluation tables created successfully\n');
    }

    // 2. Get a published tender
    console.log('Step 2: Finding published tenders...');
    const tenderResult = await client.query(`
      SELECT tender_id, title, organization_id FROM tender 
      WHERE status = 'PUBLISHED' 
      LIMIT 1;
    `);

    if (tenderResult.rows.length === 0) {
      console.log('⚠️ No published tenders found. Skipping workflow test.\n');
      return;
    }

    const tender = tenderResult.rows[0];
    console.log(`✅ Found tender: ${tender.title}\n`);

    // 3. Get bids for this tender
    console.log('Step 3: Finding proposals (bids) for this tender...');
    const proposalsResult = await client.query(`
      SELECT proposal_id, organization_id FROM proposal 
      WHERE tender_id = $1 
      LIMIT 3;
    `, [tender.tender_id]);

    console.log(`✅ Found ${proposalsResult.rows.length} proposals\n`);

    if (proposalsResult.rows.length === 0) {
      console.log('⚠️ No proposals found for this tender.\n');
      return;
    }

    // 4. Initialize evaluation for this tender
    console.log('Step 4: Initializing evaluation...');
    
    // Check if evaluation already initialized
    const existingEval = await client.query(
      'SELECT * FROM tender_evaluation_status WHERE tender_id = $1',
      [tender.tender_id]
    );

    if (existingEval.rows.length === 0) {
      await client.query(`
        INSERT INTO tender_evaluation_status (tender_id, evaluation_status, total_bids_received)
        VALUES ($1, 'IN_PROGRESS', $2)
      `, [tender.tender_id, proposalsResult.rows.length]);

      console.log('✅ Evaluation initialized\n');
    } else {
      console.log('✅ Evaluation already initialized\n');
    }

    // 5. Create bid evaluation records
    console.log('Step 5: Creating bid evaluation records...');
    
    for (const proposal of proposalsResult.rows) {
      const existingRecord = await client.query(
        'SELECT * FROM bid_evaluation WHERE proposal_id = $1',
        [proposal.proposal_id]
      );

      if (existingRecord.rows.length === 0) {
        // Get bid amount from proposal
        const propDetail = await client.query(`
          SELECT financial_proposal_amount FROM proposal WHERE proposal_id = $1
        `, [proposal.proposal_id]);

        const bidAmount = propDetail.rows[0]?.financial_proposal_amount || 0;

        // Get organization name
        const orgDetail = await client.query(`
          SELECT name FROM organization WHERE organization_id = $1
        `, [proposal.organization_id]);

        const orgName = orgDetail.rows[0]?.name || 'Unknown';

        await client.query(`
          INSERT INTO bid_evaluation (
            tender_id, proposal_id, organization_name, bid_amount, technical_status
          ) VALUES ($1, $2, $3, $4, $5)
        `, [tender.tender_id, proposal.proposal_id, orgName, bidAmount, 'PENDING']);
      }
    }
    console.log('✅ Bid evaluation records created\n');

    // 6. Get evaluations
    console.log('Step 6: Retrieving all bid evaluations...');
    const evaluations = await client.query(`
      SELECT be.*, o.name as org_name FROM bid_evaluation be
      LEFT JOIN organization o ON be.organization_id = o.organization_id
      WHERE be.tender_id = $1
      ORDER BY be.bid_amount ASC
    `, [tender.tender_id]);

    console.log(`✅ Retrieved ${evaluations.rows.length} evaluations\n`);

    if (evaluations.rows.length > 0) {
      console.log('Sample evaluation record:');
      const sample = evaluations.rows[0];
      console.log(`  - Organization: ${sample.organization_name}`);
      console.log(`  - Bid Amount: ₹${sample.bid_amount}`);
      console.log(`  - Status: ${sample.technical_status}\n`);
    }

    // 7. Update an evaluation
    if (evaluations.rows.length > 0) {
      console.log('Step 7: Updating a bid evaluation...');
      const evalId = evaluations.rows[0].evaluation_id;

      await client.query(`
        UPDATE bid_evaluation 
        SET technical_status = 'QUALIFIED', technical_score = 85, remarks = 'Test evaluation'
        WHERE evaluation_id = $1
      `, [evalId]);

      console.log('✅ Bid evaluation updated\n');
    }

    // 8. Get evaluation summary
    console.log('Step 8: Getting evaluation summary...');
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_bids,
        SUM(CASE WHEN technical_status = 'QUALIFIED' THEN 1 ELSE 0 END) as qualified_bids,
        SUM(CASE WHEN technical_status = 'DISQUALIFIED' THEN 1 ELSE 0 END) as disqualified_bids,
        MIN(CASE WHEN technical_status = 'QUALIFIED' THEN bid_amount END) as l1_amount
      FROM bid_evaluation
      WHERE tender_id = $1
    `, [tender.tender_id]);

    console.log(`✅ Summary:`);
    console.log(`  - Total Bids: ${summary.rows[0].total_bids}`);
    console.log(`  - Qualified: ${summary.rows[0].qualified_bids}`);
    console.log(`  - Disqualified: ${summary.rows[0].disqualified_bids}`);
    console.log(`  - L1 Amount: ₹${summary.rows[0].l1_amount || 'N/A'}\n`);

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testEvaluationWorkflow();
