import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  // Express derives req.secure from protocol and trusted proxy headers. The
  // application sets an explicit trust-proxy policy during server bootstrap.
  return req.secure || req.protocol === "https";
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // SameSite=None is necessary only for HTTPS embedded-preview contexts.
    // Local HTTP development uses Lax because browsers reject None without Secure.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
