import { describe, expect, it } from "vitest";
import { analyzeInboundReply } from "./replyIntelligence";
import { getCaseReference, mailerooPayloadSchema } from "./mailerooWebhook";

describe("⚖️ Compliance-Aware Inbound Email Intelligence & Security", () => {
  describe("1. Security Verification & Inbound Payload Parsing", () => {
    it("accepts a valid Maileroo inbound payload with SPF, DKIM, and DMARC aligned", () => {
      const payload = {
        _id: "evt_inbound_9812401824",
        message_id: "<inbound-msg-123@maileroo.org>",
        envelope_sender: "cybercell-inquiry@police.gov.in",
        recipients: ["inbound@lienguard.maileroo.org"],
        headers: {
          Subject: ["[LG-2026-A1B2C3D4E5F6] Regarding bank lien investigation"],
        },
        body: {
          stripped_plaintext: "We have received your grievance. Please submit original bank statements.",
          plaintext: "We have received your grievance. Please submit original bank statements.",
        },
        validation_url: "https://inbound-api.maileroo.net/validate",
        is_spam: false,
        spf_result: true,
        dkim_result: true,
        is_dmarc_aligned: true,
      };

      const parsed = mailerooPayloadSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it("rejects an invalid payload missing required envelope_sender", () => {
      const invalid = {
        _id: "evt_123",
        message_id: "msg_123",
        envelope_sender: "", // Invalid
        recipients: ["test@example.com"],
        headers: {},
        body: {},
      };

      const parsed = mailerooPayloadSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("2. Case Reference Extraction & Secure Matching", () => {
    it("extracts unique LienGuard case reference from subject line", () => {
      const payload = {
        _id: "evt_123456",
        message_id: "msg_123456",
        envelope_sender: "officer@bank.com",
        recipients: ["inbound@maileroo.org"],
        headers: {
          Subject: ["RE: [LG-2026-F98A1234BCDE] Follow-up regarding cyber lien"],
        },
        body: { plaintext: "Investigation status updated." },
        validation_url: "https://inbound-api.maileroo.net/validate",
        is_spam: false,
        spf_result: true,
        dkim_result: true,
        is_dmarc_aligned: true,
      };

      const ref = getCaseReference(payload as any);
      expect(ref).toBe("LG-2026-F98A1234BCDE");
    });

    it("extracts unique LienGuard case reference from body if not in subject", () => {
      const payload = {
        _id: "evt_123456",
        message_id: "msg_123456",
        envelope_sender: "officer@bank.com",
        recipients: ["inbound@maileroo.org"],
        headers: {
          Subject: ["Notice of Inquiry"],
        },
        body: {
          plaintext: "In reference to case LG-2026-7890ABCDEF12, the account freeze is under review.",
        },
        validation_url: "https://inbound-api.maileroo.net/validate",
        is_spam: false,
        spf_result: true,
        dkim_result: true,
        is_dmarc_aligned: true,
      };

      const ref = getCaseReference(payload as any);
      expect(ref).toBe("LG-2026-7890ABCDEF12");
    });

    it("returns null when no case reference is present", () => {
      const payload = {
        _id: "evt_123456",
        message_id: "msg_123456",
        envelope_sender: "unknown@sender.com",
        recipients: ["inbound@maileroo.org"],
        headers: {
          Subject: ["General inquiry"],
        },
        body: {
          plaintext: "Hello, please help with my bank.",
        },
        validation_url: "https://inbound-api.maileroo.net/validate",
        is_spam: false,
        spf_result: true,
        dkim_result: true,
        is_dmarc_aligned: true,
      };

      const ref = getCaseReference(payload as any);
      expect(ref).toBeNull();
    });
  });

  describe("3. AI-Assisted Reply Intelligence & Document Extraction", () => {
    it("extracts requested documents and classifies intent as REQUESTING_DOCUMENTS", () => {
      const analysis = analyzeInboundReply({
        subject: "[LG-2026-981240182412] Status Inquiry",
        body: "Your complaint has been received. Please provide the original bank statement and account-opening document so that we can continue the investigation.",
        senderEmail: "nodal@demobank.com",
        caseId: "LG-2026-981240182412",
      });

      expect(analysis.intent).toBe("REQUESTING_DOCUMENTS");
      expect(analysis.confidence).toBe("HIGH");
      expect(analysis.requestedDocuments).toContain("Original Bank / Account Statement");
      expect(analysis.requestedDocuments).toContain("Account-Opening Documentation / KYC Form");
      expect(analysis.citizenActionRequired).toContain("Upload requested documents");
      expect(analysis.disclaimer).toBe("AI-assisted analysis. Review before taking action.");
    });

    it("classifies RESOLVED intent when authority issues clearance / revocation", () => {
      const analysis = analyzeInboundReply({
        subject: "RE: [LG-2026-981240182412] Lien Notice",
        body: "This is to inform that the inquiry is complete. The lien has been removed and NOC issued to the bank.",
        senderEmail: "cybercrime@statepolice.gov.in",
        caseId: "LG-2026-981240182412",
      });

      expect(analysis.intent).toBe("RESOLVED");
      expect(analysis.confidence).toBe("HIGH");
      expect(analysis.summary).toContain("resolved or revoked");
      expect(analysis.suggestedNextStep).toContain("RESOLVED");
    });

    it("classifies REJECTED intent when authority refuses to lift lien", () => {
      const analysis = analyzeInboundReply({
        subject: "RE: [LG-2026-981240182412] Request to lift lien",
        body: "Upon preliminary assessment, your representation has been denied and rejected due to ongoing FIR proceedings.",
        senderEmail: "cybercell@gov.in",
        caseId: "LG-2026-981240182412",
      });

      expect(analysis.intent).toBe("REJECTED");
      expect(analysis.confidence).toBe("HIGH");
      expect(analysis.suggestedNextStep).toContain("RTI drafting");
    });

    it("classifies ACKNOWLEDGED intent for standard acknowledgment without document request", () => {
      const analysis = analyzeInboundReply({
        subject: "RE: [LG-2026-981240182412] Case Notice",
        body: "Your complaint has been acknowledged and registered. The matter is currently under investigation by the cyber cell.",
        senderEmail: "cybercell@gov.in",
        caseId: "LG-2026-981240182412",
      });

      expect(analysis.intent).toBe("ACKNOWLEDGED");
      expect(analysis.confidence).toBe("HIGH");
      expect(analysis.suggestedNextStep).toContain("48 hours");
    });

    it("gracefully provides fallback analysis for ambiguous / generic text", () => {
      const analysis = analyzeInboundReply({
        subject: "Case Update",
        body: "Noted.",
        senderEmail: "officer@bank.com",
      });

      expect(analysis.intent).toBe("NO_CLEAR_ACTION");
      expect(analysis.summary).toBeDefined();
      expect(analysis.disclaimer).toBe("AI-assisted analysis. Review before taking action.");
    });
  });
});
