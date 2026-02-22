#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const allowedNodeEnv = new Set(["production", "development", "test"]);
if (!allowedNodeEnv.has(process.env.NODE_ENV)) {
  console.warn(
    `[build] Invalid NODE_ENV="${process.env.NODE_ENV ?? ""}". Overriding to "production" for Next.js build.`
  );
  process.env.NODE_ENV = "production";
}

const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("[build] Failed to run next build:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
