import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

async function reconcileMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);
  try {
    console.log("Connected to MySQL database.");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        hash text NOT NULL,
        created_at bigint(20) DEFAULT NULL,
        PRIMARY KEY (id)
      )
    `);

    const journalPath = path.resolve(process.cwd(), "drizzle/meta/_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

    const [rows] = await connection.execute("SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at ASC");
    console.log(`Current migrations in __drizzle_migrations: ${rows.length}`);
    for (const r of rows) {
      console.log(` - ID: ${r.id}, created_at: ${r.created_at}`);
    }

    const existingTimestamps = new Set(rows.map(r => Number(r.created_at)));

    for (const entry of journal.entries) {
      const entryMillis = entry.when;
      const sqlFile = path.resolve(process.cwd(), `drizzle/${entry.tag}.sql`);
      const sqlContent = fs.readFileSync(sqlFile, "utf-8");
      const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

      if (!existingTimestamps.has(entryMillis)) {
        console.log(`Recording missing migration: ${entry.tag} (when: ${entryMillis})`);
        await connection.execute(
          "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
          [hash, entryMillis]
        );
        console.log(`Recorded ${entry.tag} successfully.`);
      } else {
        console.log(`Migration ${entry.tag} (when: ${entryMillis}) is already recorded.`);
      }
    }

    console.log("Migration history reconciliation complete.");
  } finally {
    await connection.end();
  }
}

reconcileMigrations().catch((err) => {
  console.error("Reconciliation failed:", err.message);
  process.exit(1);
});
