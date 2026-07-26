import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // These suites cover the pure logic only — markdown/frontmatter serialization and the
    // adjuster's timing maths. Nothing here touches the DOM, an AudioContext or the network,
    // so the default node environment is all that is needed and the suite stays fast.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
})
