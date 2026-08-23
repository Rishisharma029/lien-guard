import type { Request, Response, NextFunction } from "express";
import { logSecurityEvent } from "./securityLog";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory sliding window rate limiter.
 * Designed with a clean interface so Redis / Memcached can be plugged in for multi-instance clusters.
 */
export class RateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    public readonly name: string,
    public readonly maxRequests: number,
    public readonly windowMs: number,
    private readonly message = "Too many requests. Please try again later."
  ) {
    // Periodic garbage collection every 2 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 2 * 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  public check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime: now + this.windowMs };
    }

    if (record.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true, remaining: this.maxRequests - record.count, resetTime: record.resetTime };
  }

  public middleware(keyExtractor?: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
      const key = keyExtractor ? keyExtractor(req) : `${this.name}:${ip}`;
      const { allowed, remaining, resetTime } = this.check(key);

      res.setHeader("X-RateLimit-Limit", this.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString());

      if (!allowed) {
        logSecurityEvent({
          type: "RATE_LIMIT_TRIGGERED",
          ip,
          userAgent: req.get("user-agent"),
          details: { limiter: this.name, path: req.path, key },
          result: "BLOCKED",
        });
        res.status(429).json({
          error: this.message,
          retryAfterSeconds: Math.ceil((resetTime - Date.now()) / 1000),
        });
        return;
      }

      next();
    };
  }

  private cleanup() {
    const now = Date.now();
    this.store.forEach((record, key) => {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    });
  }

  public reset(key: string) {
    this.store.delete(key);
  }

  public destroy() {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}

// Configured rate limiters for LienGuard
export const authRateLimiter = new RateLimiter("auth", 15, 60 * 1000, "Too many login attempts. Please wait a moment.");
export const webhookRateLimiter = new RateLimiter("webhook", 60, 60 * 1000, "Webhook rate limit exceeded.");
export const scheduledRateLimiter = new RateLimiter("scheduled", 30, 60 * 1000, "Scheduled automation rate limit exceeded.");
export const uploadRateLimiter = new RateLimiter("upload", 20, 60 * 1000, "Document upload rate limit exceeded.");
export const apiRateLimiter = new RateLimiter("api", 300, 60 * 1000, "API rate limit exceeded.");
