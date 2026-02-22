#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

if (process.env.NODE_ENV !== "production") {
  console.warn(
    `[build] NODE_ENV="${process.env.NODE_ENV ?? ""}" detected. Forcing NODE_ENV="production" for deterministic Next.js builds.`
  );
}
process.env.NODE_ENV = "production";

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
