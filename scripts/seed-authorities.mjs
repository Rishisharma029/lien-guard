import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { authorityDirectory } from '../drizzle/schema.js';
import { OFFICIAL_CYBER_AUTHORITIES } from '../server/authoritySeedData.js';
import { eq } from 'drizzle-orm';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not defined in environment');
    process.exit(1);
  }

  console.log('[Seed] Connecting to MySQL...');
  const pool = mysql.createPool(dbUrl);
  const db = drizzle(pool);

  console.log(`[Seed] Seeding ${OFFICIAL_CYBER_AUTHORITIES.length} official state/UT authorities from National Cyber Crime Reporting Portal...`);

  let inserted = 0;
  let updated = 0;

  for (const auth of OFFICIAL_CYBER_AUTHORITIES) {
    const existing = await db
      .select()
      .from(authorityDirectory)
      .where(eq(authorityDirectory.stateUt, auth.stateUt))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(authorityDirectory).values({
        stateUt: auth.stateUt,
        authorityType: auth.authorityType,
        authorityName: auth.authorityName,
        officerName: auth.officerName,
        designation: auth.designation,
        officialEmail: auth.officialEmail,
        phone: auth.phone || null,
        sourceName: auth.sourceName,
        sourceUrl: auth.sourceUrl,
        lastVerifiedAt: auth.lastVerifiedAt,
        active: 1,
      });
      inserted++;
    } else {
      await db
        .update(authorityDirectory)
        .set({
          authorityName: auth.authorityName,
          officerName: auth.officerName,
          designation: auth.designation,
          officialEmail: auth.officialEmail,
          phone: auth.phone || null,
          sourceName: auth.sourceName,
          sourceUrl: auth.sourceUrl,
          lastVerifiedAt: auth.lastVerifiedAt,
          active: 1,
        })
        .where(eq(authorityDirectory.id, existing[0].id));
      updated++;
    }
  }

  console.log(`[Seed] Completed! Inserted: ${inserted}, Updated: ${updated}`);
  await pool.end();
}

main().catch(err => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});
