const required = [
  "DATABASE_URL",
  "MAILEROO_SMTP_USER",
  "MAILEROO_SMTP_PASSWORD",
  "MAILEROO_FROM_EMAIL",
  "MAILEROO_REPLY_TO",
  "MAILEROO_INBOUND_DOMAIN",
  "AUTOMATION_SECRET",
];

const missing = required.filter(name => !process.env[name]?.trim());
const errors = [];

if (process.env.EMAIL_DELIVERY_MODE !== "demo") {
  errors.push("EMAIL_DELIVERY_MODE must be exactly 'demo' for the controlled demonstration.");
}

const recipients = (process.env.DEMO_EMAIL_RECIPIENTS || "")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

if (recipients.length !== 1) {
  errors.push("DEMO_EMAIL_RECIPIENTS must contain exactly one controlled test mailbox for the demonstration.");
}

if (process.env.MAILEROO_SMTP_PORT && !["465", "587", "2525"].includes(process.env.MAILEROO_SMTP_PORT)) {
  errors.push("MAILEROO_SMTP_PORT must be 465, 587, or 2525.");
}

if (missing.length || errors.length) {
  console.error("Controlled demo preflight failed. No secret values are displayed.");
  if (missing.length) console.error(`Missing server-side variables: ${missing.join(", ")}`);
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log("Controlled demo preflight passed: delivery is demo-only and restricted to one configured test recipient.");
