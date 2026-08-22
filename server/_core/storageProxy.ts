import type { Express } from "express";

/**
 * Storage objects are deliberately not exposed through a key-to-URL proxy.
 * Case-document downloads are authorized by the documents.download tRPC
 * procedure before a short-lived signed URL is issued.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*path", (_req, res) => {
    res.status(404).send("Not found");
  });
}
