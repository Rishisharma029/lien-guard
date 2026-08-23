import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { runDeadlineAutomation } from "./automation";
import { scheduledRateLimiter } from "./rateLimit";
import { logSecurityEvent } from "./securityLog";

function safelyMatchesAutomationSecret(req: Request) {
  if (!ENV.automationSecret) return false;
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const expected = Buffer.from(ENV.automationSecret, "utf8");
  const provided = Buffer.from(token, "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

async function isAuthenticatedScheduledCallback(req: Request) {
  if (safelyMatchesAutomationSecret(req)) return true;
  try {
    const user = await sdk.authenticateRequest(req);
    return user.isCron === true;
  } catch {
    return false;
  }
}

async function processDeadlineAutomation(req: Request, res: Response) {
  if (!(await isAuthenticatedScheduledCallback(req))) {
    logSecurityEvent({
      type: "UNAUTHORIZED_ACCESS_ATTEMPT",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      details: { path: req.path, reason: "Scheduled callback authorization failed" },
      result: "BLOCKED",
    });
    res.status(401).json({ error: "Scheduled callback authentication failed." });
    return;
  }

  try {
    const summary = await runDeadlineAutomation();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, summary });
  } catch (error) {
    console.error("[Deadline automation] failed", error instanceof Error ? error.message : error);
    res.status(500).json({ error: "Deadline automation could not complete." });
  }
}

export function registerScheduledRoutes(app: Express) {
  app.post(
    "/api/scheduled/deadline-automation",
    scheduledRateLimiter.middleware(),
    processDeadlineAutomation
  );
}
