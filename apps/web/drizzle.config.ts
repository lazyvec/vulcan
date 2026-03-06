import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.VULCAN_DB_PATH ?? "./data/vulcan.db",
  },
  strict: true,
  verbose: true,
});
