import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataRoot = path.join(root, "src", "_data");
const errors = [];
const banned = ["CONTENT_TODO", "202X", "example.com", "Ideas into Impact", "Competition Awards"];

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(location);
    return entry.name.endsWith(".json") ? [location] : [];
  }));
  return nested.flat();
}

function walk(value, trail, visitor) {
  visitor(value, trail);
  if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${trail}[${index}]`, visitor));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walk(item, `${trail}.${key}`, visitor);
  }
}

for (const file of await jsonFiles(dataRoot)) {
  const content = await readFile(file, "utf8");
  const relative = path.relative(root, file);
  for (const token of banned) {
    if (content.includes(token)) errors.push(`${relative}: contains forbidden sample token ${token}`);
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    errors.push(`${relative}: invalid JSON (${error.message})`);
    continue;
  }

  walk(data, relative, (value, trail) => {
    if (value === "draft") errors.push(`${trail}: draft content cannot enter production`);
    if (typeof value !== "string") return;
    if (value.startsWith("/assets/")) {
      const local = path.join(root, "src", value.replace(/^\//, ""));
      if (!existsSync(local)) errors.push(`${trail}: missing asset ${value}`);
    }
    if (/^https?:/.test(value) && !/^https:\/\//.test(value)) errors.push(`${trail}: external URL must use HTTPS`);
  });
}

const videoDir = path.join(root, "src", "assets", "video");
for (const filename of await readdir(videoDir)) {
  const info = await stat(path.join(videoDir, filename));
  if (info.size > 25 * 1024 * 1024) errors.push(`${filename}: video exceeds 25 MB`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Content validation passed: real sources, ready status, assets, URLs, and video budgets are valid.");
