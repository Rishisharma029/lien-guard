import { TRPCError } from "@trpc/server";
import { basename } from "node:path";
import { isDangerousExtension, validateFileMagicBytes } from "./fileValidation";
import { logSecurityEvent } from "./securityLog";

export const MAX_CASE_DOCUMENT_BYTES = 10 * 1024 * 1024;

const allowedDocumentTypes = new Map<string, readonly string[]>([
  ["application/pdf", [".pdf"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
  ["image/png", [".png"]],
  ["text/plain", [".txt"]],
]);

export function sanitizeDocumentFileName(fileName: string) {
  // Prevent directory traversal across Windows and POSIX path separators
  const normalizedSeparators = fileName.trim().replace(/\\+/g, "/");
  const baseName = basename(normalizedSeparators).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_");
  const normalized = baseName.replace(/\s+/g, " ").slice(0, 255);
  if (!normalized || normalized === "." || normalized === "..") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Provide a valid document file name." });
  }
  return normalized;
}

function extensionOf(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot < 0 ? "" : fileName.slice(lastDot).toLowerCase();
}

function isValidBase64(value: string) {
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}

/**
 * Hardened validation: validates extension, MIME type, size, and magic byte signatures.
 */
export function decodeCaseDocument(input: {
  fileName: string;
  contentType: string;
  base64: string;
  userId?: number;
  caseId?: string;
}) {
  const ext = extensionOf(input.fileName);

  // 1. Prohibit dangerous / executable extensions
  if (isDangerousExtension(ext)) {
    logSecurityEvent({
      type: "FILE_UPLOAD_REJECTED",
      userId: input.userId,
      caseId: input.caseId,
      details: { fileName: input.fileName, reason: "Dangerous file extension rejected", ext },
      result: "BLOCKED",
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Executable or script files are strictly prohibited.",
    });
  }

  const fileName = sanitizeDocumentFileName(input.fileName);
  const contentType = input.contentType.trim().toLowerCase();
  const expectedExtensions = allowedDocumentTypes.get(contentType);

  if (!expectedExtensions) {
    logSecurityEvent({
      type: "FILE_UPLOAD_REJECTED",
      userId: input.userId,
      caseId: input.caseId,
      details: { fileName, contentType, reason: "Unaccepted MIME type" },
      result: "BLOCKED",
    });
    throw new TRPCError({ code: "BAD_REQUEST", message: "Only PDF, JPEG, PNG, and text documents are accepted." });
  }

  if (!expectedExtensions.includes(extensionOf(fileName))) {
    logSecurityEvent({
      type: "FILE_UPLOAD_REJECTED",
      userId: input.userId,
      caseId: input.caseId,
      details: { fileName, contentType, reason: "Extension MIME mismatch" },
      result: "BLOCKED",
    });
    throw new TRPCError({ code: "BAD_REQUEST", message: "The file extension does not match its declared type." });
  }

  if (!isValidBase64(input.base64)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The document payload is invalid." });
  }

  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length || bytes.length > MAX_CASE_DOCUMENT_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Documents must be between 1 byte and 10 MB." });
  }

  // 2. Inspect Magic Bytes (Deep file header verification)
  const magicValidation = validateFileMagicBytes(bytes, contentType);
  if (!magicValidation.valid) {
    logSecurityEvent({
      type: "FILE_UPLOAD_REJECTED",
      userId: input.userId,
      caseId: input.caseId,
      details: {
        fileName,
        contentType,
        detectedMime: magicValidation.detectedMime,
        reason: magicValidation.error,
      },
      result: "BLOCKED",
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `File content failed format verification: ${magicValidation.error || "Invalid file signature."}`,
    });
  }

  return { fileName, contentType, bytes };
}
