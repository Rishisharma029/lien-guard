# Lien Guard Production Email and Automation Runbook

**Status:** Implementation complete; activation remains intentionally configuration-gated. The application will not deliver real email, accept inbound email, or process scheduled deadlines until the deployment settings below are supplied.

## 1. Apply the database migration

Deploy the committed application first, then run the generated migration against the production MySQL-compatible database from a trusted administrative environment:

```bash
DATABASE_URL='mysql://…' pnpm drizzle-kit migrate
```

This applies `drizzle/0006_mail_delivery_and_deadline_automation.sql`, which adds the authority email, email outbox state, provider message identifiers, immutable automation events, and idempotency records. Take a database backup and verify the migration in a staging clone before production.

## 2. Configure deployment secrets

Store the following values in the deployment platform’s encrypted server-side secret store. Do **not** place them in Vite environment variables, the repository, client code, browser configuration, or logs.

| Variable | Required for | Notes |
|---|---|---|
| `MAILEROO_SMTP_USER` | Outbound email | Maileroo SMTP account username. |
| `MAILEROO_SMTP_PASSWORD` | Outbound email | Maileroo SMTP account password. |
| `MAILEROO_FROM_EMAIL` | Outbound email | A verified sender address on the configured Maileroo domain. |
| `MAILEROO_SMTP_HOST` | Outbound email | `smtp.maileroo.com`. |
| `MAILEROO_SMTP_PORT` | Outbound email | Use `587` with STARTTLS, or `465` with implicit TLS. |
| `MAILEROO_REPLY_TO` | Inbound replies | An address under the inbound-routing domain. |
| `MAILEROO_INBOUND_DOMAIN` | Inbound replies | The domain configured in Maileroo Inbound Routing, without `@`. |
| `AUTOMATION_SECRET` | Scheduled processing | A newly generated random value of at least 32 characters. |
| `DEADLINE_ESCALATION_GRACE_HOURS` | Deadline policy | Defaults to `48`; set a documented operating policy. |
| `EMAIL_DELIVERY_MODE` | External-delivery safety | Defaults to `disabled`. Use `demo` for a controlled test recipient; use `live` only after explicit production approval. |
| `DEMO_EMAIL_RECIPIENTS` | Demo safety | Comma-separated controlled recipient allowlist. Required for any `demo` delivery. |

> **Credential hygiene:** because an SMTP password was supplied in chat during implementation, rotate it in Maileroo before go-live and store the replacement only in the deployment secret manager.

Maileroo documents `smtp.maileroo.com` and supports authenticated SMTP over port 587 or 2525 with STARTTLS, and port 465 with SSL/TLS. The application uses port 587, requires TLS, validates certificates, imposes connection timeouts, and rejects header-injection characters. [1] [2]

For the hackathon demo, keep `EMAIL_DELIVERY_MODE=demo` and set `DEMO_EMAIL_RECIPIENTS` to one controlled mailbox. This is now enforced server-side: all external email delivery is disabled by default, and demo mode defers any recipient not on that explicit allowlist.

## 3. Configure Maileroo inbound routing

Create a Maileroo inbound route for the same reply domain and point it to:

```text
POST https://YOUR-DEPLOYED-DOMAIN/api/webhooks/maileroo/inbound
```

The receiver requires a valid Maileroo payload with a successful SPF result, DKIM result, and DMARC alignment. It uses Maileroo’s single-use `validation_url` before recording the message, accepts replies only when the sender equals the case’s stored authority email, and routes only when the case reference appears in the recipient or subject. The provider event ID is stored uniquely, so retries cannot duplicate correspondence. Maileroo’s inbound webhook payload includes the case-relevant headers and stripped text, while provider-hosted attachments are intentionally **not** fetched automatically. [3]

The case-email service prefixes every authority email subject with `[LG-YYYY-XXXXXXXXXXXX]`. Keep this prefix intact in replies so the inbound route can match the protected case record.

## 4. Activate deadline automation

The repository includes `.github/workflows/deadline-automation.yml`. To activate it, set these **GitHub repository secrets**:

| Secret | Value |
|---|---|
| `LIENGUARD_APP_URL` | The HTTPS deployment root, for example `https://lienguard.example`. |
| `LIENGUARD_AUTOMATION_SECRET` | Exactly the value of deployment-side `AUTOMATION_SECRET`. |

The workflow then calls the protected endpoint hourly. The endpoint rejects unauthenticated requests and returns no cached response. A supported Manus scheduled callback may also call the same route using its authenticated cron identity; do not run both schedulers unless operating duplication is deliberately required. The database idempotency keys protect against duplicate follow-ups and escalations, but a single scheduler remains easier to observe.

The business sequence is deterministic:

1. The job scans `AWAITING_RESPONSE` cases whose response deadline has passed.
2. It queues one traceable follow-up for the recorded authority email and attempts SMTP delivery.
3. If no lifecycle change has been recorded after the configured grace period, it escalates the case exactly once.
4. RTI drafting becomes available only after the stored `ESCALATED` state; it produces a protected draft and never files or sends an RTI request automatically.

## 5. Post-deployment validation

Use a staging case with a controlled recipient before any operational case. Confirm that the event timeline records queued, sent, failed, or inbound states as appropriate. Then perform these checks:

```bash
# The scheduler route must reject requests without a bearer token.
curl -i -X POST https://YOUR-DEPLOYED-DOMAIN/api/scheduled/deadline-automation

# With a temporary test secret in a trusted shell, the route should return an automation summary.
curl --fail -X POST https://YOUR-DEPLOYED-DOMAIN/api/scheduled/deadline-automation \
  -H "Authorization: Bearer $AUTOMATION_SECRET"
```

Test inbound correspondence by replying from the exact authority address recorded on a staging case. Verify that the provider’s validation URL succeeds, the correspondence appears once, and the timeline adds an inbound-email event. Do not test against a live citizen case first.

## References

[1]: https://maileroo.com/docs/smtp-relay/server-configuration "Maileroo SMTP server configuration"
[2]: https://maileroo.com/docs/smtp-relay/authentication-details "Maileroo SMTP authentication details"
[3]: https://maileroo.com/docs/inbound-routing/webhooks "Maileroo inbound routing webhooks"
