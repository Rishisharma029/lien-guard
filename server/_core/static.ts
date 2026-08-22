import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const possiblePaths = [
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "../..", "dist", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];

  const distPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

  if (!fs.existsSync(distPath)) {
    console.warn(
      `[Static] Build directory not found: ${distPath}. Run 'pnpm build' to compile the client.`
    );
  }

  app.use(express.static(distPath));

  // Fall through to index.html for client-side SPA routing
  app.use((_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Client build not found. Please ensure 'pnpm build' has completed.");
    }
  });
}
