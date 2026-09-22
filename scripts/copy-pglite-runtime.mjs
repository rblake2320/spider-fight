#!/usr/bin/env node
/**
 * Nitro's Vercel packager follows JavaScript imports but PGlite loads its WASM
 * and filesystem bundle with `new URL()` at runtime. Copy those runtime files
 * beside Nitro's bundled PGlite module so `vite preview` and the deployed
 * server function can start the local fallback database.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "node_modules", "@electric-sql", "pglite", "dist");
const destination = join(root, ".vercel", "output", "functions", "__server.func", "_libs");
const assets = ["pglite.data", "pglite.wasm", "initdb.wasm"];

for (const asset of assets) {
  if (!existsSync(join(source, asset))) {
    throw new Error(`PGlite runtime asset is missing from the installed package: ${asset}`);
  }
}

mkdirSync(destination, { recursive: true });
for (const asset of assets) cpSync(join(source, asset), join(destination, asset));
console.log(`[pglite-runtime] copied ${assets.join(", ")} to the server bundle`);
