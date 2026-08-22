import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { MAX_CASE_DOCUMENT_BYTES, decodeCaseDocument, sanitizeDocumentFileName } from "./documents";

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");

describe("case document validation", () => {
  it("accepts an allowed type, matching extension, and valid base64 payload", () => {
    const document = decodeCaseDocument({
      fileName: "lien-evidence.pdf",
      contentType: "application/pdf",
      base64: encode("minimal test document"),
    });

    expect(document.fileName).toBe("lien-evidence.pdf");
    expect(document.contentType).toBe("application/pdf");
    expect(document.bytes.toString("utf8")).toBe("minimal test document");
  });

  it("rejects unsupported content types and extension mismatches", () => {
    expect(() => decodeCaseDocument({ fileName: "evidence.exe", contentType: "application/octet-stream", base64: encode("x") })).toThrow(TRPCError);
    expect(() => decodeCaseDocument({ fileName: "evidence.pdf", contentType: "image/png", base64: encode("x") })).toThrow(TRPCError);
  });

  it("rejects malformed, empty, and oversized document data", () => {
    expect(() => decodeCaseDocument({ fileName: "evidence.txt", contentType: "text/plain", base64: "not-base64!" })).toThrow(TRPCError);
    expect(() => decodeCaseDocument({ fileName: "evidence.txt", contentType: "text/plain", base64: "" })).toThrow(TRPCError);
    expect(() => decodeCaseDocument({
      fileName: "evidence.txt",
      contentType: "text/plain",
      base64: Buffer.alloc(MAX_CASE_DOCUMENT_BYTES + 1, 1).toString("base64"),
    })).toThrow(TRPCError);
  });

  it("removes path components and unsafe filename characters", () => {
    expect(sanitizeDocumentFileName("../../statement:final?.pdf")).toBe("statement_final_.pdf");
  });
});
