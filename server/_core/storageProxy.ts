import type { Express, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { ENV } from "./env";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "uploads");

/**
 * Storage proxy endpoint.
 * In local development/demo environments, serves files from the local uploads directory.
 * Prevents directory traversal and sets strict security headers.
 */
export function registerStorageProxy(app: Express) {
  app.use("/manus-storage", (req: Request, res: Response) => {
    const rawPath = req.path.replace(/^\//, "");
    const sanitizedPath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, "");

    // Prevent path traversal
    const resolvedPath = path.resolve(LOCAL_STORAGE_DIR, sanitizedPath);
    if (!resolvedPath.startsWith(LOCAL_STORAGE_DIR)) {
      res.status(403).send("Forbidden");
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).send("File not found");
      return;
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.sendFile(resolvedPath);
  });
}
