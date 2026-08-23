import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  // Express derives req.secure from protocol and trusted proxy headers. The
  // application sets an explicit trust-proxy policy during server bootstrap.
  return req.secure || req.protocol === "https";
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure" | "maxAge"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}
