import { describe, expect, it } from "vitest";
import { buildDeadlineFollowUp, deadlineActionKey } from "./automation";
import { isValidEmailAddress } from "./maileroo";

describe("Maileroo communication safeguards", () => {
  it("accepts ordinary email addresses but rejects control characters and malformed recipients", () => {
    expect(isValidEmailAddress("authority@example.org")).toBe(true);
    expect(isValidEmailAddress("authority@example.org\r\nBcc: attacker@example.org")).toBe(false);
    expect(isValidEmailAddress("not-an-email")).toBe(false);
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
