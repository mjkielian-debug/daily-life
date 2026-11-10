#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const [build, ...noteParts] = process.argv.slice(2);
const note = noteParts.join(" ").trim();
if (!build || !/^20\d{6}-[a-z][a-z0-9-]{1,50}$/i.test(build)) {
  console.error("Usage: node scripts/prepare-release.mjs YYYYMMDD-label1 \"short release note\"");
  process.exit(2);
}

const root = process.cwd();
const indexPath = path.join(root, "index.html");
const workerPath = path.join(root, "sw.js");
const releasePath = path.join(root, "release.json");
let html = fs.readFileSync(indexPath, "utf8");
let worker = fs.readFileSync(workerPath, "utf8");
const release = JSON.parse(fs.readFileSync(releasePath, "utf8"));

const buildPattern = /const\s+APP_BUILD\s*=\s*["'][^"']+["']/;
if (!buildPattern.test(html)) throw new Error("Could not find APP_BUILD in index.html.");
html = html.replace(buildPattern, 'const APP_BUILD="' + build + '"');

const shellMatch = worker.match(/const\s+APP_SHELL\s*=\[([\s\S]*?)\n\];/);
if (!shellMatch) throw new Error("Could not find APP_SHELL in sw.js.");
const assets = new Set([...shellMatch[1].matchAll(/["']([^"']+)["']/g)].map(match => match[1]));
assets.add("./");
assets.add("./index.html");

function addLocalAsset(raw) {
  if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) return;
  const pathname = new URL(raw, "https://daily-life.local/").pathname.replace(/^\/+/, "");
  if (pathname) assets.add("./" + pathname);
}
for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) addLocalAsset(match[1]);
for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
  if (!/\brel=["'][^"']*stylesheet[^"']*["']/i.test(match[0])) continue;
  const href = match[0].match(/\bhref=["']([^"']+)["']/i);
  if (href) addLocalAsset(href[1]);
}
const shell = [...assets].sort((a, b) => a === "./" ? -1 : b === "./" ? 1 : a.localeCompare(b));
worker = worker.replace(shellMatch[0], "const APP_SHELL=[" + shell.map(asset => "  " + JSON.stringify(asset)).join(",\n") + "\n];");

release.build = build;
release.released = build.slice(0, 4) + "-" + build.slice(4, 6) + "-" + build.slice(6, 8);
if (note) release.ui = (String(release.ui || "").trim() + " " + note).trim();

fs.writeFileSync(indexPath, html);
fs.writeFileSync(workerPath, worker);
fs.writeFileSync(releasePath, JSON.stringify(release, null, 2) + "\n");
console.log("Prepared " + build + ": APP_BUILD, release.json, and service-worker assets are aligned.");
