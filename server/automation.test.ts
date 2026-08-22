import { describe, expect, it } from "vitest";
import { buildDeadlineFollowUp, deadlineActionKey } from "./automation";
import { isValidEmailAddress } from "./maileroo";
import { createEmailDeliveryGuard } from "./_core/env";

describe("Maileroo communication safeguards", () => {
  it("accepts ordinary email addresses but rejects control characters and malformed recipients", () => {
    expect(isValidEmailAddress("authority@example.org")).toBe(true);
    expect(isValidEmailAddress("authority@example.org\r\nBcc: attacker@example.org")).toBe(false);
    expect(isValidEmailAddress("not-an-email")).toBe(false);
  });

  it("defaults to denying external delivery when no live or demo mode is configured", () => {
    const guard = createEmailDeliveryGuard("", "");
    expect(guard.isRecipientAllowed("authority@example.org")).toBe(false);
    expect(guard.blockReason("authority@example.org")).toContain("disabled");
  });

  it("permits only the explicit recipient in demo mode", () => {
    const guard = createEmailDeliveryGuard("demo", "controlled@example.org");
    expect(guard.isRecipientAllowed("controlled@example.org")).toBe(true);
    expect(guard.isRecipientAllowed("other@example.org")).toBe(false);
  });

  it("builds a traceable deadline follow-up with a stable idempotency key", () => {
    const caseRecord = {
      id: 17,
      caseId: "LG-2026-ABCDEF123456",
      title: "Cybercrime lien review",
      authorityName: "Cyber Cell",
      responseDeadline: new Date("2026-08-20T00:00:00.000Z"),
    };

    const message = buildDeadlineFollowUp(caseRecord);
    expect(message.subject).toContain(caseRecord.caseId);
    expect(message.body).toContain("Cyber Cell");
    expect(deadlineActionKey(caseRecord, "follow-up")).toBe("follow-up:17:2026-08-20T00:00:00.000Z");
    expect(deadlineActionKey(caseRecord, "escalation")).not.toBe(deadlineActionKey(caseRecord, "follow-up"));
  });
});
