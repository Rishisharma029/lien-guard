import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = mysql.createPool(dbUrl);
  console.log('[Migration 0007] Connecting to database...');

  // 1. Create authority_directory table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS authority_directory (
      id int AUTO_INCREMENT NOT NULL,
      state_ut varchar(100) NOT NULL,
      district varchar(100),
      authority_type enum('CYBER_CELL','GRIEVANCE_OFFICER','BANK_NODAL','OTHER') NOT NULL DEFAULT 'CYBER_CELL',
      authority_name varchar(200) NOT NULL,
      officer_name varchar(200),
      designation varchar(200),
      official_email varchar(320),
      phone varchar(30),
      source_name varchar(200) NOT NULL,
      source_url varchar(512) NOT NULL,
      last_verified_at timestamp NOT NULL,
      active int NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY authority_directory_state_type_idx (state_ut, authority_type, active)
    )
  `);
  console.log('[Migration 0007] authority_directory created/verified');

  // 2. Create case_authority_assignments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_authority_assignments (
      id int AUTO_INCREMENT NOT NULL,
      case_id int NOT NULL,
      authority_directory_id int,
      authority_name varchar(200) NOT NULL,
      authority_email varchar(320),
      officer_name varchar(200),
      designation varchar(200),
      source_name varchar(200) NOT NULL,
      source_url varchar(512) NOT NULL,
      last_verified_at timestamp NOT NULL,
      routing_reason varchar(500),
      assigned_by_user_id int,
      assigned_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY case_authority_assignments_case_idx (case_id, assigned_at)
    )
  `);
  console.log('[Migration 0007] case_authority_assignments created/verified');

  // 3. Add authority_directory_id column to cases if not exists
  const [cols] = await pool.query(`SHOW COLUMNS FROM cases LIKE 'authority_directory_id'`);
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE cases ADD COLUMN authority_directory_id int`);
    console.log('[Migration 0007] Added authority_directory_id to cases');
  }

  // 4. Update case_events enum type to include AUTHORITY_RECOMMENDED, AUTHORITY_ASSIGNED, AUTHORITY_CHANGED
  await pool.query(`
    ALTER TABLE case_events MODIFY COLUMN type enum(
      'CASE_CREATED','DETAILS_UPDATED','STATUS_CHANGED','COMMUNICATION_RECORDED',
      'EMAIL_QUEUED','EMAIL_SENT','EMAIL_FAILED','INBOUND_EMAIL_RECEIVED',
      'DEADLINE_FOLLOW_UP_QUEUED','DEADLINE_ESCALATED','DOCUMENT_UPLOADED',
      'RTI_DRAFT_CREATED','AUTHORITY_RECOMMENDED','AUTHORITY_ASSIGNED','AUTHORITY_CHANGED'
    ) NOT NULL
  `);
  console.log('[Migration 0007] Updated case_events type enum');

  // 5. Update __drizzle_migrations if table exists
  try {
    const [existing] = await pool.query(`SELECT * FROM __drizzle_migrations WHERE tag = '0007_authority_directory'`);
    if (existing.length === 0) {
      await pool.query(`
        INSERT INTO __drizzle_migrations (hash, created_at, tag)
        VALUES ('hash_0007_authority_directory', 1787500000000, '0007_authority_directory')
      `);
      console.log('[Migration 0007] Recorded in __drizzle_migrations');
    }
  } catch (err) {
    console.log('[Migration 0007] Note on __drizzle_migrations:', err.message);
  }

  await pool.end();
  console.log('[Migration 0007] Migration 0007 applied successfully!');
}

main().catch(err => {
  console.error('[Migration 0007] Error:', err);
  process.exit(1);
});
