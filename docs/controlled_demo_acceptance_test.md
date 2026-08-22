# Controlled Maileroo Demo Acceptance Test

This is the single end-to-end acceptance test for the Lien Guard hackathon demonstration. It must be run only after migration `0006` is applied to the chosen database, the application is deployed over HTTPS, and the new SMTP password is stored in the deployment platform’s server-side secret manager. Do not run the test against a real authority, a real citizen case, or `EMAIL_DELIVERY_MODE=live`.

## Safe runtime configuration

Set the server-side settings below in the deployment secret store. Values shown here are names or placeholders only; no credential belongs in source control, client code, browser configuration, screenshots, or this checklist.

| Variable | Demo requirement |
|---|---|
| `DATABASE_URL` | Approved hackathon database containing migration `0006`. |
| `MAILEROO_SMTP_USER` | Dedicated `lienguard-demo` SMTP username. |
| `MAILEROO_SMTP_PASSWORD` | The newly generated password stored only in the secret manager. |
| `MAILEROO_FROM_EMAIL` | Sender address accepted by the configured Maileroo demo domain. |
| `MAILEROO_SMTP_HOST` | `smtp.maileroo.com`. |
| `MAILEROO_SMTP_PORT` | `587` for STARTTLS. |
| `MAILEROO_REPLY_TO` | An address in the configured inbound-routing domain. |
| `MAILEROO_INBOUND_DOMAIN` | The inbound-routing domain, without `@`. |
| `AUTOMATION_SECRET` | A new high-entropy scheduler secret. |
| `EMAIL_DELIVERY_MODE` | Exactly `demo`. |
| `DEMO_EMAIL_RECIPIENTS` | Exactly one controlled mailbox that you own. |

Run the preflight in the deployment shell before demo testing:

```bash
pnpm demo:check
```

The preflight prints only missing variable names and safety-policy failures. It never prints credential values.

## Single acceptance flow

| Step | Action | Expected observable result |
|---|---|---|
| 1 | Create a new **demo-only** case. | A unique `LG-…` reference and `CASE_CREATED` timeline event appear. |
| 2 | Record the controlled authority name and its approved allowlisted test email. | The routing update appears in the immutable timeline. |
| 3 | Move the case through its valid lifecycle to `AWAITING_RESPONSE` and record a near-term response deadline. | The case health changes to pending/approaching deadline as appropriate. |
| 4 | Use **Send securely via Maileroo**. | A correspondence entry appears as `queued`, then `sent` only when Maileroo accepts it. The subject includes the `[LG-…]` reference. |
| 5 | Verify the controlled recipient inbox. | The controlled mailbox receives the message. No real authority should receive anything. |
| 6 | Make the demo deadline overdue in the demo database, then invoke the authenticated scheduler endpoint once. | The job queues one automated follow-up and records the corresponding case event. |
| 7 | Invoke the scheduler a second time without changing the case. | No duplicate follow-up is created because the automation action has a unique idempotency key. |
| 8 | Reply from the same controlled authority mailbox, retaining the case reference in the subject. | Maileroo posts the inbound event to the deployed HTTPS webhook. |
| 9 | Allow the webhook to pass provider validation. | The backend verifies route/domain/sender/authentication conditions, identifies the case, and records one inbound communication and one timeline event. |
| 10 | Replay or retry the same provider event. | The provider event identifier prevents duplicate case correspondence. |
| 11 | After the configured grace period, invoke the scheduler for an unchanged overdue case. | The case changes to `ESCALATED` once and RTI drafting becomes available. |
| 12 | Generate and save an RTI draft. | A protected `RTI_DRAFT` document and audit event appear; nothing is filed or sent externally. |

## Required Maileroo setup

Configure an inbound route in Maileroo pointing to:

```text
POST https://YOUR-DEPLOYED-DOMAIN/api/webhooks/maileroo/inbound
```

Maileroo’s inbound event must come from the controlled sender recorded on the case. The backend accepts no generic untrusted inbound message; it validates the provider’s one-time validation URL, sender, inbound domain, mail authentication fields, and case reference before adding any communication. [1]

## Stop conditions

Stop the demonstration and keep delivery disabled if the test recipient is not the allowlisted controlled mailbox, migration `0006` is absent, the deployment uses a non-HTTPS URL, the server preflight fails, or the inbound route cannot validate correctly. Do not work around these controls by changing `EMAIL_DELIVERY_MODE` to `live`.

## Reference

[1]: https://maileroo.com/docs/inbound-routing/webhooks "Maileroo inbound routing webhooks"
