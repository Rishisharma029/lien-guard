import { describe, expect, it } from "vitest";
import { createCaseTimeline, getCaseHealth } from "./cases";

const baseCase = {
  status: "AWAITING_RESPONSE" as const,
  responseDeadline: new Date("2026-08-23T12:00:00.000Z"),
  createdAt: new Date("2026-08-20T12:00:00.000Z"),
  updatedAt: new Date("2026-08-21T12:00:00.000Z"),
};

describe("case journey helpers", () => {
  it("labels response deadlines according to the current lifecycle posture", () => {
    expect(getCaseHealth(baseCase, new Date("2026-08-22T18:00:00.000Z"))).toBe("DEADLINE_APPROACHING");
    expect(getCaseHealth(baseCase, new Date("2026-08-24T12:00:00.000Z"))).toBe("ESCALATION_REQUIRED");
    expect(getCaseHealth({ ...baseCase, status: "RESOLVED" }, new Date())).toBe("RESOLVED");
  });

  it("creates a chronological timeline from recorded case data without inventing communications", () => {
    const timeline = createCaseTimeline({ ...baseCase, id: 1, caseId: "LG-2026-CASE01", userId: 2, title: "Review", description: "A test case record with sufficient detail.", caseType: "Lien review", priority: "HIGH", bankName: "Example Bank", lienAmount: "15000.00", lienDate: null, lienReference: null, transactionReference: null, authorityName: "Case authority", createdAt: baseCase.createdAt, updatedAt: baseCase.updatedAt });
    expect(timeline.map(event => event.id)).toEqual(["case-created", "current-status", "response-deadline"]);
    expect(timeline[0]?.title).toBe("Case record created");
  });
});
