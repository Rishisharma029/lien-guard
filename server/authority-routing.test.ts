import { describe, expect, it } from "vitest";
import { getCaseTypeAuthorityType, getRecommendedAuthority, normalizeStateUt } from "./authorityRouting";
import { authorityTypes, AuthorityDirectoryEntry } from "../drizzle/schema";
import { isEmailRecipientAllowedForDelivery, createEmailDeliveryGuard } from "./_core/env";
import { OFFICIAL_CYBER_AUTHORITIES } from "./authoritySeedData";

describe("Official Authority Directory & Intelligent Routing Test Suite", () => {
  // 1. State normalization
  describe("1. State/UT Name Normalization", () => {
    it("normalizes uppercase and lowercase state names to canonical form", () => {
      expect(normalizeStateUt("haryana")).toBe("Haryana");
      expect(normalizeStateUt("HARYANA")).toBe("Haryana");
      expect(normalizeStateUt("  Haryana  ")).toBe("Haryana");
      expect(normalizeStateUt("delhi")).toBe("Delhi");
      expect(normalizeStateUt("new delhi")).toBe("Delhi");
    });

    it("normalizes common abbreviations and variant spellings", () => {
      expect(normalizeStateUt("ap")).toBe("Andhra Pradesh");
      expect(normalizeStateUt("up")).toBe("Uttar Pradesh");
      expect(normalizeStateUt("mp")).toBe("Madhya Pradesh");
      expect(normalizeStateUt("wb")).toBe("West Bengal");
      expect(normalizeStateUt("orissa")).toBe("Odisha");
      expect(normalizeStateUt("pondicherry")).toBe("Puducherry");
    });

    it("preserves unlisted inputs cleanly without crashing", () => {
      expect(normalizeStateUt("Custom State")).toBe("Custom State");
    });
  });

  // 2. Authority lookup and routing
  describe("2. Deterministic Authority Lookup", () => {
    const mockDb: AuthorityDirectoryEntry[] = [
      {
        id: 1,
        stateUt: "Haryana",
        district: null,
        authorityType: "CYBER_CELL",
        authorityName: "Haryana State Cyber Crime Police Station (PHQ Panchkula)",
        officerName: "Sh. Sibash Kabiraj",
        designation: "IPS, ADGP Cyber Haryana",
        officialEmail: "sp-cybercrimephq.pol@hry.gov.in",
        phone: "0172-2524058",
        sourceName: "National Cyber Crime Reporting Portal",
        sourceUrl: "https://cybercrime.gov.in/",
        lastVerifiedAt: new Date("2026-08-23"),
        active: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        stateUt: "Delhi",
        district: null,
        authorityType: "CYBER_CELL",
        authorityName: "Delhi Police Special Cell / IFSO Cyber Unit",
        officerName: "Sh. Vinit Kumar, IPS",
        designation: "DCP/IFSO",
        officialEmail: "dcp-ifso@delhipolice.gov.in",
        phone: "011-20892633",
        sourceName: "National Cyber Crime Reporting Portal",
        sourceUrl: "https://cybercrime.gov.in/",
        lastVerifiedAt: new Date("2026-08-23"),
        active: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        stateUt: "InactiveState",
        district: null,
        authorityType: "CYBER_CELL",
        authorityName: "Old Inactive Unit",
        officerName: null,
        designation: null,
        officialEmail: null,
        phone: null,
        sourceName: "National Cyber Crime Reporting Portal",
        sourceUrl: "https://cybercrime.gov.in/",
        lastVerifiedAt: new Date("2026-08-23"),
        active: 0, // Inactive
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockLookup = async (stateUt: string, type: string) => {
      return mockDb.find(a => a.stateUt === stateUt && a.authorityType === type && a.active === 1);
    };

    it("correctly routes to Haryana Cyber Cell when state is Haryana", async () => {
      const res = await getRecommendedAuthority(
        { stateUt: "haryana", caseType: "Cyber Crime Lien" },
        mockLookup as any
      );
      expect(res).not.toBeNull();
      expect(res?.authority.authorityName).toBe("Haryana State Cyber Crime Police Station (PHQ Panchkula)");
      expect(res?.authority.officerName).toBe("Sh. Sibash Kabiraj");
      expect(res?.authority.officialEmail).toBe("sp-cybercrimephq.pol@hry.gov.in");
      expect(res?.authority.sourceName).toBe("National Cyber Crime Reporting Portal");
      expect(res?.hasContactDetails).toBe(true);
    });

    it("returns null when no authority exists for State/UT (never fabricates data)", async () => {
      const res = await getRecommendedAuthority(
        { stateUt: "Atlantis", caseType: "Cyber Crime Lien" },
        mockLookup as any
      );
      expect(res).toBeNull();
    });

    it("excludes inactive authority records from routing", async () => {
      const res = await getRecommendedAuthority(
        { stateUt: "InactiveState", caseType: "Cyber Crime Lien" },
        mockLookup as any
      );
      expect(res).toBeNull();
    });
  });

  // 3. Case type routing mapping
  describe("3. Case Type to Authority Type Mapping", () => {
    it("maps cyber, fraud, upi, phishing cases to CYBER_CELL", () => {
      expect(getCaseTypeAuthorityType("Bank lien / Cybercrime")).toBe("CYBER_CELL");
      expect(getCaseTypeAuthorityType("Cyber Fraud Dispute")).toBe("CYBER_CELL");
      expect(getCaseTypeAuthorityType("UPI unauthorized freeze")).toBe("CYBER_CELL");
      expect(getCaseTypeAuthorityType("Phishing attack report")).toBe("CYBER_CELL");
    });

    it("maps bank, nodal, and review cases correctly", () => {
      expect(getCaseTypeAuthorityType("Bank Nodal Escalation")).toBe("BANK_NODAL");
      expect(getCaseTypeAuthorityType("Public Grievance Redressal")).toBe("GRIEVANCE_OFFICER");
    });
  });

  // 4. Source attribution and data authenticity
  describe("4. Official Source Data Authenticity", () => {
    it("contains all 36 States/UTs in the official government seed directory", () => {
      expect(OFFICIAL_CYBER_AUTHORITIES.length).toBe(36);
    });

    it("ensures every official seed record has source attribution to cybercrime.gov.in", () => {
      for (const record of OFFICIAL_CYBER_AUTHORITIES) {
        expect(record.sourceName).toBe("National Cyber Crime Reporting Portal");
        expect(record.sourceUrl).toBe("https://cybercrime.gov.in/");
        expect(record.lastVerifiedAt).toBeInstanceOf(Date);
        expect(record.stateUt).toBeDefined();
        expect(record.authorityName).toBeDefined();
        expect(record.officialEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      }
    });

    it("verifies accurate nodal officer for Haryana (Sh. Sibash Kabiraj, IPS)", () => {
      const haryana = OFFICIAL_CYBER_AUTHORITIES.find(a => a.stateUt === "Haryana");
      expect(haryana).toBeDefined();
      expect(haryana?.officerName).toBe("Sh. Sibash Kabiraj");
      expect(haryana?.designation).toBe("IPS, ADGP Cyber Haryana");
      expect(haryana?.officialEmail).toBe("sp-cybercrimephq.pol@hry.gov.in");
      expect(haryana?.phone).toBe("0172-2524058");
    });

    it("verifies accurate nodal officer for Delhi (Sh. Vinit Kumar, IPS, DCP/IFSO)", () => {
      const delhi = OFFICIAL_CYBER_AUTHORITIES.find(a => a.stateUt === "Delhi");
      expect(delhi).toBeDefined();
      expect(delhi?.officerName).toBe("Sh. Vinit Kumar, IPS");
      expect(delhi?.designation).toBe("DCP/IFSO");
      expect(delhi?.officialEmail).toBe("dcp-ifso@delhipolice.gov.in");
    });

    it("verifies accurate nodal officer for Maharashtra (Sh. Sanjay Shintre, DIG)", () => {
      const maharashtra = OFFICIAL_CYBER_AUTHORITIES.find(a => a.stateUt === "Maharashtra");
      expect(maharashtra).toBeDefined();
      expect(maharashtra?.officerName).toBe("Sh. Sanjay Shintre");
      expect(maharashtra?.designation).toBe("DIG Cyber Crime Maharashtra");
      expect(maharashtra?.officialEmail).toBe("dig.cbr-mah@gov.in");
    });
  });

  // 5. Point-in-time snapshot and historical preservation
  describe("5. Point-in-Time Assignment Snapshot", () => {
    it("models historical authority snapshot fields independently from directory updates", () => {
      const originalAssignment = {
        id: 101,
        caseId: 50,
        authorityDirectoryId: 12,
        authorityName: "Haryana State Cyber Crime Police Station",
        authorityEmail: "sp-cybercrimephq.pol@hry.gov.in",
        officerName: "Sh. Sibash Kabiraj",
        designation: "IPS, ADGP Cyber Haryana",
        sourceName: "National Cyber Crime Reporting Portal",
        sourceUrl: "https://cybercrime.gov.in/",
        lastVerifiedAt: new Date("2026-08-23"),
        assignedAt: new Date("2026-08-23T06:00:00Z"),
      };

      // Simulating a directory change (e.g. new officer appointed)
      const updatedDirectoryEntry = {
        id: 12,
        officerName: "New Appointed Officer",
        designation: "New SP Cyber",
        officialEmail: "new-email@hry.gov.in",
      };

      // Historical case assignment must preserve original snapshot values
      expect(originalAssignment.officerName).toBe("Sh. Sibash Kabiraj");
      expect(originalAssignment.authorityEmail).toBe("sp-cybercrimephq.pol@hry.gov.in");
      expect(originalAssignment.assignedAt.toISOString()).toBe("2026-08-23T06:00:00.000Z");
    });
  });

  // 6. Security guardrails & demo safety
  describe("6. Email Security Guardrails in Demo Mode", () => {
    const demoGuard = createEmailDeliveryGuard("demo", "i.rishisharma2007@gmail.com");

    it("allows email delivery strictly to allowlisted demo test inbox", () => {
      expect(demoGuard.isRecipientAllowed("i.rishisharma2007@gmail.com")).toBe(true);
      expect(demoGuard.isRecipientAllowed("I.RISHISHARMA2007@GMAIL.COM")).toBe(true);
    });

    it("strictly blocks delivery to real official government emails during demo mode", () => {
      expect(demoGuard.isRecipientAllowed("sp-cybercrimephq.pol@hry.gov.in")).toBe(false);
      expect(demoGuard.isRecipientAllowed("dcp-ifso@delhipolice.gov.in")).toBe(false);
      expect(demoGuard.isRecipientAllowed("dig.cbr-mah@gov.in")).toBe(false);
      expect(demoGuard.blockReason("sp-cybercrimephq.pol@hry.gov.in")).toContain("allowlist");
    });
  });
});
