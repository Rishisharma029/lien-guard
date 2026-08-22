import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    env: {
      DATABASE_URL: "mysql://mock-user:mock-pass@localhost:3306/mock_lienguard",
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      NODE_ENV: "test",
    },
  },
});
