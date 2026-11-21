import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        include: ["src/lib/csv.ts", "src/lib/navigation.ts", "src/lib/voterStorage.ts"],
        thresholds: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  }),
);
