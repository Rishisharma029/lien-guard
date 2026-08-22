# Maileroo Integration Research Notes

Maileroo documents an authenticated SMTP relay at `smtp.maileroo.com`. Its supported ports are `465`, `587`, and `2525`; use SSL/TLS for `465` and STARTTLS for `587` or `2525`. The service advises against plaintext SMTP. Maileroo’s authentication documentation specifies that the SMTP account email address and password from the domain’s SMTP Accounts dashboard are the credentials used to authenticate.

The Lien Guard integration will therefore use server-only environment variables, encrypted in the deployment platform and excluded from source control: `MAILEROO_SMTP_USER`, `MAILEROO_SMTP_PASSWORD`, `MAILEROO_FROM_EMAIL`, and optional `MAILEROO_REPLY_TO`. The application will use port 587 with STARTTLS, TLS certificate validation enabled, timeouts, recipient validation, and an idempotent outbox so retries cannot create duplicate operational messages.

Maileroo’s documentation navigation also exposes inbound routing and webhooks. Actual inbound handling will be kept behind an explicit signed-webhook configuration requirement; it will never accept a generic unauthenticated email payload.

Official references:

1. [SMTP server configuration](https://maileroo.com/docs/smtp-relay/server-configuration)
2. [SMTP authentication details](https://maileroo.com/docs/smtp-relay/authentication-details)
3. [Maileroo documentation](https://maileroo.com/docs)

## Inbound webhook validation

Maileroo’s inbound-routing webhook documentation describes a single-use `validation_url` supplied in every webhook payload. The receiver must call that URL exactly once and accept the payload only when the response body is `{ "success": true }`; all later calls return failure. The payload includes the domain, envelope sender, recipients, message ID, headers, a body with stripped plain text/HTML, and attachment download URLs. The application will validate the payload shape, invoke this one-time validation URL before persistence, and deduplicate inbound correspondence by the Maileroo message ID. It will not rely on an invented local signature header.

Official reference: [Maileroo Inbound Routing Webhooks](https://maileroo.com/docs/inbound-routing/webhooks)
