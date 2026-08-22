# Email Integration Research Notes

Resend publicly documents both outbound email sending and inbound email handling. Its receiving documentation states that inbound email can trigger webhooks, including an `email.received` event; the webhook event documentation notes that the receive webhook provides metadata rather than the full body, so the application must retrieve full message content through the provider's authenticated API before creating a case communication.

Relevant official references:

1. [Receiving Emails](https://resend.com/docs/dashboard/receiving/introduction)
2. [Can You Receive Emails with Resend?](https://resend.com/docs/knowledge-base/how-can-i-receive-emails-with-resend)
3. [Managing Webhooks](https://resend.com/docs/webhooks/introduction)
4. [email.received webhook event](https://resend.com/docs/webhooks/emails/received)
5. [Send Email API](https://resend.com/docs/api-reference/emails/send-email)

Architecture implication: use a verified webhook signature before accepting inbound delivery events; use idempotency based on the provider message identifier; then fetch and validate the full message with server-side credentials before recording the communication or updating a case. Never auto-file RTI requests; only generate protected drafts after the documented case-state gate is met.
