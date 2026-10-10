import { spawnSync } from "node:child_process";
import fs from "node:fs";
const files = [
  "js/catalog-core.js",
  "js/platform.js",
  "js/account-flow.js",
  "js/platform-app.js",
  "scripts/serve.mjs",
];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
const pages = [
  "index",
  "properties",
  "property-details",
  "dashboard",
  "signin",
  "signup",
  "about",
  "contact",
  "privacy",
  "terms",
  "neighborhoods",
  "renting-guide",
  "faq",
];
for (const page of pages) {
  const html = fs.readFileSync(page + ".html", "utf8");
  for (const required of [
    'name="description"',
    'id="main"',
    "js/platform-app.js",
    "style/platform.css",
  ]) {
    if (!html.includes(required))
      throw new Error(page + " is missing " + required);
  }
}
console.log("Syntax and public-page checks passed.");
