/**
 * Strict file type and magic byte validator for evidence documents.
 * Never relies on client-provided Content-Type or file extensions alone.
 */

const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".dll", ".bat", ".cmd", ".ps1", ".vbs", ".sh", ".bash",
  ".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx", ".html", ".htm",
  ".svg", ".xml", ".xhtml", ".php", ".py", ".rb", ".pl", ".jar",
  ".war", ".jsp", ".asp", ".aspx", ".cgi", ".msi", ".com", ".scr",
  ".pif", ".application", ".gadget", ".hta", ".cpl", ".msc", ".jar",
  ".zip", ".tar", ".gz", ".7z", ".rar", ".iso",
]);

export interface MagicByteValidationResult {
  valid: boolean;
  detectedMime: string | null;
  error?: string;
}

/**
 * Inspects leading magic bytes to verify genuine file format.
 */
export function validateFileMagicBytes(bytes: Buffer, declaredContentType: string): MagicByteValidationResult {
  if (!bytes || bytes.length === 0) {
    return { valid: false, detectedMime: null, error: "File buffer is empty." };
  }

  // 1. PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    if (declaredContentType === "application/pdf") {
      return { valid: true, detectedMime: "application/pdf" };
    }
    return { valid: false, detectedMime: "application/pdf", error: "File content is PDF but declared type differs." };
  }

  // 2. PNG: \x89PNG\r\n\x1a\n (0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    if (declaredContentType === "image/png") {
      return { valid: true, detectedMime: "image/png" };
    }
    return { valid: false, detectedMime: "image/png", error: "File content is PNG but declared type differs." };
  }

  // 3. JPEG/JPG: \xFF\xD8\xFF (0xFF, 0xD8, 0xFF)
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    if (declaredContentType === "image/jpeg" || declaredContentType === "image/jpg") {
      return { valid: true, detectedMime: "image/jpeg" };
    }
    return { valid: false, detectedMime: "image/jpeg", error: "File content is JPEG but declared type differs." };
  }

  // 4. Plain text / UTF-8: Verify it does not contain binary NULL bytes or executable headers (e.g. MZ, ELF, shebang)
  if (declaredContentType === "text/plain") {
    // Check for DOS MZ header: 'MZ' (0x4D, 0x5A)
    if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      return { valid: false, detectedMime: "application/x-dosexec", error: "Executable binary cannot be uploaded as text." };
    }
    // Check for ELF header: \x7FELF (0x7F, 0x45, 0x4C, 0x46)
    if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      return { valid: false, detectedMime: "application/x-elf", error: "Executable binary cannot be uploaded as text." };
    }
    // Check for null bytes in initial chunk (typical of binary files)
    const checkLength = Math.min(bytes.length, 1024);
    for (let i = 0; i < checkLength; i++) {
      if (bytes[i] === 0x00) {
        return { valid: false, detectedMime: "application/octet-stream", error: "Binary content cannot be uploaded as plain text." };
      }
    }
    return { valid: true, detectedMime: "text/plain" };
  }

  return {
    valid: false,
    detectedMime: null,
    error: "File content does not match allowed signatures for PDF, PNG, JPEG, or plain text.",
  };
}

/**
 * Validates file extension against prohibited executable / script extensions.
 */
export function isDangerousExtension(extension: string): boolean {
  const normalized = extension.toLowerCase().trim();
  const withDot = normalized.startsWith(".") ? normalized : `.${normalized}`;
  return DANGEROUS_EXTENSIONS.has(withDot);
}
