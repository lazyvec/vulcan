import { defineConfig } from "vitest/config";
import path from "node:path";

const sharedDir = path.resolve(__dirname, "../../packages/shared/src");

export default defineConfig({
  resolve: {
    alias: [
      { find: "@vulcan/shared/constants", replacement: path.join(sharedDir, "constants.ts") },
      { find: "@vulcan/shared/types", replacement: path.join(sharedDir, "types.ts") },
      { find: "@vulcan/shared/schemas", replacement: path.join(sharedDir, "schemas.ts") },
      { find: "@vulcan/shared", replacement: path.join(sharedDir, "index.ts") },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/gateway-rpc/**"],
  },
});
