import { defineConfig } from "vitest/config"

// The app's own "@/…" imports, as in tsconfig.json: the question types in
// src/questions are tested along with what they render.
export default defineConfig({ resolve: { tsconfigPaths: true } })
