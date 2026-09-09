import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerMailerooWebhook } from "../mailerooWebhook";
import { registerScheduledRoutes } from "../scheduled";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { ENV, isOriginAllowed } from "./env";
import { logSecurityEvent } from "../securityLog";
import { apiRateLimiter } from "../rateLimit";

function isPortAvailable(port: number, host: string = "0.0.0.0"): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => {
        setTimeout(() => resolve(true), 50);
      });
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(startPort: number = 3000, host: string = "0.0.0.0"): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  return startPort;
}

async function startServer() {
  console.log("[LienGuard] Initializing server...");
  const app = express();
  const server = createServer(app);

  // 1. Proxy Trust: Honor exactly one trusted reverse proxy
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // 2. Comprehensive Security Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");

    // HSTS: Only apply in production when running over HTTPS
    const isHttps = req.secure || req.protocol === "https" || req.get("x-forwarded-proto") === "https";
    if (ENV.isProduction && isHttps) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
  });

  // 3. Strict CORS Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.get("origin");

    if (origin) {
      if (isOriginAllowed(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-csrf-token, x-trpc-source");
        res.setHeader("Vary", "Origin");
      } else {
        logSecurityEvent({
          type: "UNAUTHORIZED_ACCESS_ATTEMPT",
          ip: req.ip,
          userAgent: req.get("user-agent"),
          details: { origin, path: req.path, method: req.method, reason: "CORS origin rejected" },
          result: "BLOCKED",
        });
        res.status(403).json({ error: "CORS policy violation: Origin not allowed." });
        return;
      }
    }

    // Handle preflight OPTIONS
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  // 4. CSRF Defense-in-Depth for State-Changing Requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    const stateChanging = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";
    
    // Exempt webhooks, scheduled cron endpoints, OAuth callbacks, and health probes
    const isExempt =
      req.path === "/health" ||
      req.path.startsWith("/api/webhooks/") ||
      req.path.startsWith("/api/scheduled/") ||
      req.path.startsWith("/api/oauth/");

    if (stateChanging && !isExempt) {
      const origin = req.get("origin");
      const referer = req.get("referer");

      if (origin && !isOriginAllowed(origin)) {
        logSecurityEvent({
          type: "CSRF_REJECTED",
          ip: req.ip,
          userAgent: req.get("user-agent"),
          details: { origin, path: req.path, reason: "State-changing request from untrusted origin" },
          result: "BLOCKED",
        });
        res.status(403).json({ error: "CSRF protection: Untrusted origin rejected." });
        return;
      }

      if (!origin && referer) {
        try {
          const refererOrigin = new URL(referer).origin;
          if (!isOriginAllowed(refererOrigin)) {
            logSecurityEvent({
              type: "CSRF_REJECTED",
              ip: req.ip,
              userAgent: req.get("user-agent"),
              details: { referer, refererOrigin, path: req.path, reason: "State-changing request from untrusted referer" },
              result: "BLOCKED",
            });
            res.status(403).json({ error: "CSRF protection: Untrusted referer rejected." });
            return;
          }
        } catch {
          // Malformed referer
          res.status(403).json({ error: "CSRF protection: Invalid referer." });
          return;
        }
      }
    }

    next();
  });

  // 5. Health check endpoint for monitoring
  app.get("/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 6. Register Webhook (with its own 256 KB parser & rate limiter)
  registerMailerooWebhook(app);

  // 7. General JSON and URL-Encoded Parsers (15 MB for base64 document upload transport)
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // 8. Error handling for oversized payloads (HTTP 413)
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err && (err.type === "entity.too.large" || err.status === 413)) {
      res.status(413).json({ error: "Payload Too Large: Request body exceeds size limit." });
      return;
    }
    next(err);
  });

  // 9. API routes
  app.use("/api/trpc", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  registerStorageProxy(app);
  registerScheduledRoutes(app);
  registerOAuthRoutes(app);

  // 10. tRPC API with rate limiting
  app.use(
    "/api/trpc",
    apiRateLimiter.middleware(),
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // 11. Static files / Vite dev server
  if (process.env.NODE_ENV === "development") {
    try {
      const viteModule = "./vite";
      const { setupVite } = await import(viteModule);
      await setupVite(app, server);
    } catch {
      serveStatic(app);
    }
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const host = "0.0.0.0";
  const port = process.env.NODE_ENV === "production" ? preferredPort : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, host, () => {
    console.log(`[LienGuard] Server running securely on http://${host}:${port}/ (Env: ${process.env.NODE_ENV || "development"})`);
  });
}

startServer().catch(console.error);
