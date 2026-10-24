#!/usr/bin/env node
// Copy the IDL that `anchor build` produced into the package the apps import from.
// Run after a build: pnpm sync:idl
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const from = path.join(root, "contracts/solana/target/idl");
const to = path.join(root, "packages/contracts/solana");

const json = fs.readdirSync(from).find((f) => f.endsWith(".json"));
if (!json) {
  console.error(`no IDL in ${from} — run "anchor build" in contracts/solana first`);
  process.exit(1);
}
fs.copyFileSync(path.join(from, json), path.join(to, "idl.json"));
const ts = json.replace(/\.json$/, ".ts");
if (fs.existsSync(path.join(from, ts))) fs.copyFileSync(path.join(from, ts), path.join(to, "idl.ts"));
console.log(`synced ${json} → packages/contracts/solana/idl.json`);
