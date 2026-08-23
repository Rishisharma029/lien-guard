import "dotenv/config";
import mysql from "mysql2/promise";

if (process.env.NODE_ENV === "production") {
  throw new Error("Local demonstration seeding is not permitted in production.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in .env to seed the database.");
}

const pool = await mysql.createPool(process.env.DATABASE_URL);

const demoUsers = [
  {
    openId: "demo-citizen",
    name: "Demo Citizen",
    email: "citizen@lienguard.dev",
    loginMethod: "demo_auth",
    role: "citizen",
  },
  {
    openId: "demo-bank",
    name: "Nodal Bank Officer",
    email: "bank@lienguard.dev",
    loginMethod: "demo_auth",
    role: "bank",
  },
  {
    openId: "demo-authority",
    name: "Designated Police Authority",
    email: "authority@lienguard.dev",
    loginMethod: "demo_auth",
    role: "authority",
  },
  {
    openId: "demo-admin",
    name: "LienGuard System Administrator",
    email: "admin@lienguard.dev",
    loginMethod: "demo_auth",
    role: "admin",
  },
];

const demoCases = [
  {
    caseId: "LG-DEMO-ESC-001",
    title: "Authority response overdue — demonstration record",
    description: "A seeded, local-only case showing the overdue-response, escalation, audit-timeline, correspondence, and review-only RTI controls. No external authority or email account is involved.",
    caseType: "Lien release response",
    bankName: "Demo Bank",
    lienAmount: "250000.00",
    lienReference: "LG-REF-DEMO-1001",
    transactionReference: "TXN-DEMO-1001",
    authorityName: "Controlled Demonstration Authority",
    authorityEmail: "authority-demo@local.invalid",
    status: "ESCALATED",
    priority: "HIGH",
    deadlineSql: "DATE_SUB(NOW(), INTERVAL 72 HOUR)",
  },
  {
    caseId: "LG-DEMO-REV-002",
    title: "Lien verification under review — demonstration record",
    description: "A seeded local record that demonstrates the active review state, traceable authority routing, and structured case controls.",
    caseType: "Lien verification",
    bankName: "Demo Bank",
    lienAmount: "98500.00",
    lienReference: "LG-REF-DEMO-1002",
    transactionReference: "TXN-DEMO-1002",
    authorityName: "Controlled Demonstration Authority",
    authorityEmail: "authority-demo@local.invalid",
    status: "UNDER_REVIEW",
    priority: "NORMAL",
    deadlineSql: "DATE_ADD(NOW(), INTERVAL 10 DAY)",
  },
  {
    caseId: "LG-DEMO-AWAIT-003",
    title: "Authority follow-up awaiting response — demonstration record",
    description: "A seeded local record demonstrating a queued case posture while outbound delivery remains explicitly disabled in this isolated environment.",
    caseType: "Authority follow-up",
    bankName: "Demo Bank",
    lienAmount: "143750.00",
    lienReference: "LG-REF-DEMO-1003",
    transactionReference: "TXN-DEMO-1003",
    authorityName: "Controlled Demonstration Authority",
    authorityEmail: "authority-demo@local.invalid",
    status: "AWAITING_RESPONSE",
    priority: "URGENT",
    deadlineSql: "DATE_ADD(NOW(), INTERVAL 2 DAY)",
  },
];

try {
  for (const demoUser of demoUsers) {
    await pool.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), email = VALUES(email), loginMethod = VALUES(loginMethod),
         role = VALUES(role), lastSignedIn = NOW()`,
      [demoUser.openId, demoUser.name, demoUser.email, demoUser.loginMethod, demoUser.role],
    );
  }

  const [[user]] = await pool.query("SELECT id FROM users WHERE openId = ? LIMIT 1", ["demo-citizen"]);
  if (!user?.id) throw new Error("The local demonstration citizen user could not be created.");

  for (const record of demoCases) {
    await pool.query(
      `INSERT INTO cases
        (case_id, user_id, title, description, case_type, bank_name, lien_amount, lien_date, lien_reference, transaction_reference, authority_name, authority_email, response_deadline, status, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 45 DAY), ?, ?, ?, ?, ${record.deadlineSql}, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id), title = VALUES(title), description = VALUES(description), case_type = VALUES(case_type),
         bank_name = VALUES(bank_name), lien_amount = VALUES(lien_amount), lien_reference = VALUES(lien_reference),
         transaction_reference = VALUES(transaction_reference), authority_name = VALUES(authority_name), authority_email = VALUES(authority_email),
         response_deadline = VALUES(response_deadline), status = VALUES(status), priority = VALUES(priority), updated_at = NOW()`,
      [
        record.caseId,
        user.id,
        record.title,
        record.description,
        record.caseType,
        record.bankName,
        record.lienAmount,
        record.lienReference,
        record.transactionReference,
        record.authorityName,
        record.authorityEmail,
        record.status,
        record.priority,
      ],
    );
  }

  const [caseRows] = await pool.query(
    "SELECT id, case_id FROM cases WHERE case_id IN (?, ?, ?)",
    demoCases.map(record => record.caseId),
  );
  const idsByReference = new Map(caseRows.map(record => [record.case_id, record.id]));
  const caseIds = demoCases.map(record => idsByReference.get(record.caseId));
  if (caseIds.some(id => !id)) throw new Error("The local demonstration cases could not be resolved.");

  const placeholders = caseIds.map(() => "?").join(", ");
  await pool.query(`DELETE FROM case_automation_actions WHERE case_id IN (${placeholders})`, caseIds);
  await pool.query(`DELETE FROM case_communications WHERE case_id IN (${placeholders})`, caseIds);
  await pool.query(`DELETE FROM case_events WHERE case_id IN (${placeholders})`, caseIds);
  await pool.query(`DELETE FROM case_documents WHERE case_id IN (${placeholders})`, caseIds);

  const escalatedCaseId = idsByReference.get("LG-DEMO-ESC-001");
  const reviewCaseId = idsByReference.get("LG-DEMO-REV-002");
  const awaitingCaseId = idsByReference.get("LG-DEMO-AWAIT-003");

  const events = [
    [escalatedCaseId, user.id, "Local demonstration", "CASE_CREATED", "Local demonstration case created.", null, "OPEN", "DATE_SUB(NOW(), INTERVAL 8 DAY)"],
    [escalatedCaseId, user.id, "Local demonstration", "DETAILS_UPDATED", "Authority routing and response deadline recorded for local demonstration.", null, null, "DATE_SUB(NOW(), INTERVAL 7 DAY)"],
    [escalatedCaseId, user.id, "Local demonstration", "STATUS_CHANGED", "Case moved to awaiting response in the local demonstration workflow.", "OPEN", "AWAITING_RESPONSE", "DATE_SUB(NOW(), INTERVAL 6 DAY)"],
    [escalatedCaseId, user.id, "Local demonstration", "EMAIL_QUEUED", "Local-only email simulation queued. External delivery is disabled.", null, null, "DATE_SUB(NOW(), INTERVAL 6 DAY)"],
    [escalatedCaseId, null, "Local demonstration automation", "DEADLINE_FOLLOW_UP_QUEUED", "Local-only deadline follow-up simulation recorded. No external email was sent.", null, null, "DATE_SUB(NOW(), INTERVAL 3 DAY)"],
    [escalatedCaseId, null, "Local demonstration inbox", "INBOUND_EMAIL_RECEIVED", "Local-only reply simulation recorded for the case timeline. No Maileroo webhook or external mailbox was used.", null, null, "DATE_SUB(NOW(), INTERVAL 2 DAY)"],
    [escalatedCaseId, null, "Local demonstration automation", "DEADLINE_ESCALATED", "Case escalated by the local demonstration deadline workflow.", "AWAITING_RESPONSE", "ESCALATED", "DATE_SUB(NOW(), INTERVAL 1 DAY)"],
    [reviewCaseId, user.id, "Local demonstration", "CASE_CREATED", "Local demonstration review case created.", null, "OPEN", "DATE_SUB(NOW(), INTERVAL 4 DAY)"],
    [reviewCaseId, user.id, "Local demonstration", "STATUS_CHANGED", "Case moved to under review.", "OPEN", "UNDER_REVIEW", "DATE_SUB(NOW(), INTERVAL 3 DAY)"],
    [awaitingCaseId, user.id, "Local demonstration", "CASE_CREATED", "Local demonstration follow-up case created.", null, "OPEN", "DATE_SUB(NOW(), INTERVAL 3 DAY)"],
    [awaitingCaseId, user.id, "Local demonstration", "STATUS_CHANGED", "Case moved to awaiting response.", "OPEN", "AWAITING_RESPONSE", "DATE_SUB(NOW(), INTERVAL 2 DAY)"],
  ];

  for (const [caseId, actorUserId, actorLabel, type, message, previousStatus, nextStatus, createdAt] of events) {
    await pool.query(
      `INSERT INTO case_events (case_id, actor_user_id, actor_label, type, message, previous_status, next_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ${createdAt})`,
      [caseId, actorUserId, actorLabel, type, message, previousStatus, nextStatus],
    );
  }

  await pool.query(
    `INSERT INTO case_communications
      (case_id, direction, subject, counterparty, recipient_email, body, state, automated, created_at)
     VALUES
      (?, 'outbound', 'Local-only authority request simulation', 'Controlled Demonstration Authority', 'authority-demo@local.invalid', 'This local demonstration record shows a queued communication. External delivery is disabled, and no email was sent.', 'recorded', 0, DATE_SUB(NOW(), INTERVAL 6 DAY)),
      (?, 'inbound', 'Local-only reply simulation', 'Controlled Demonstration Authority', 'authority-demo@local.invalid', 'This local demonstration record shows how an inbound correspondence appears after verified routing. It did not originate from Maileroo or an external inbox.', 'received', 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
      (?, 'outbound', 'Review acknowledgement — local demonstration', 'Controlled Demonstration Authority', 'authority-demo@local.invalid', 'Demonstration correspondence record for the case currently under review. External delivery is disabled.', 'recorded', 0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
      (?, 'outbound', 'Follow-up reminder — local demonstration', 'Controlled Demonstration Authority', 'authority-demo@local.invalid', 'Demonstration follow-up record. It remains local and has not been transmitted.', 'recorded', 1, DATE_SUB(NOW(), INTERVAL 1 DAY))`,
    [escalatedCaseId, escalatedCaseId, reviewCaseId, awaitingCaseId],
  );

  await pool.query(
    `INSERT INTO case_automation_actions (case_id, action, idempotency_key, completed_at)
     VALUES (?, 'DEADLINE_FOLLOW_UP', 'local-demo-follow-up-LG-DEMO-ESC-001', DATE_SUB(NOW(), INTERVAL 3 DAY)),
            (?, 'DEADLINE_ESCALATION', 'local-demo-escalation-LG-DEMO-ESC-001', DATE_SUB(NOW(), INTERVAL 1 DAY))`,
    [escalatedCaseId, escalatedCaseId],
  );

  console.log("Seeded 3 local-only Lien Guard demonstration cases with timeline and correspondence records.");
} finally {
  await pool.end();
}
