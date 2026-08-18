import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const dataRoot = path.join(root, "src", "_data");
const errors = [];
const parsedData = new Map();
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

async function checkRaster(asset, expected, trail) {
  const local = path.join(root, "src", asset.replace(/^\//, ""));
  if (!existsSync(local)) return null;
  try {
    const metadata = await sharp(local).metadata();
    if (metadata.width !== expected.width || metadata.height !== expected.height) {
      errors.push(`${trail}: ${asset} is ${metadata.width}x${metadata.height}, expected ${expected.width}x${expected.height}`);
    }
    if (expected.format && metadata.format !== expected.format) {
      errors.push(`${trail}: ${asset} is ${metadata.format}, expected ${expected.format}`);
    }
    if (metadata.exif || metadata.xmp) errors.push(`${trail}: ${asset} contains public metadata`);
    return metadata;
  } catch (error) {
    errors.push(`${trail}: cannot inspect ${asset} (${error.message})`);
    return null;
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
  parsedData.set(path.basename(file), data);

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

const about = parsedData.get("about.json");
for (const [index, photo] of (about?.life ?? []).entries()) {
  await checkRaster(photo.src, { width: photo.width, height: photo.height }, `about.life[${index}].src`);
  const smallHeight = Math.round(photo.height * 480 / photo.width);
  await checkRaster(photo.srcSmall, { width: 480, height: smallHeight }, `about.life[${index}].srcSmall`);
}

const social = parsedData.get("social.json");
for (const [index, item] of (social ?? []).entries()) {
  if (item.kind === "dialog") {
    await checkRaster(item.image, { width: item.width, height: item.height }, `social[${index}].image`);
  }
}

const projects = parsedData.get("projects.json");
for (const [projectIndex, project] of (projects ?? []).entries()) {
  await checkRaster(project.ogImage, { width: 1200, height: 630, format: "jpeg" }, `projects[${projectIndex}].ogImage`);
  for (const [sectionIndex, section] of project.mediaSections.entries()) {
    for (const [slideIndex, slide] of section.slides.entries()) {
      await checkRaster(slide, { width: 1600, height: 900 }, `projects[${projectIndex}].mediaSections[${sectionIndex}].slides[${slideIndex}]`);
    }
  }
}

const notoCssPath = path.join(root, "src", "assets", "fonts", "noto-serif-sc.css");
const notoCss = await readFile(notoCssPath, "utf8");
if (/https?:\/\//.test(notoCss)) errors.push("noto-serif-sc.css: external font URLs are not allowed");
for (const match of notoCss.matchAll(/url\(([^)]+)\)/g)) {
  const reference = match[1].replace(/^['"]|['"]$/g, "");
  if (!existsSync(path.resolve(path.dirname(notoCssPath), reference))) {
    errors.push(`noto-serif-sc.css: missing font file ${reference}`);
  }
}
const aggregateFont = path.join(root, "src", "assets", "fonts", "files", "noto-serif-sc-chinese-simplified-400-normal.woff2");
if (existsSync(aggregateFont)) errors.push("noto-serif-sc.css: unreferenced aggregate font must not be published");

const videoDir = path.join(root, "src", "assets", "video");
for (const filename of await readdir(videoDir)) {
  const info = await stat(path.join(videoDir, filename));
  if (info.size > 25 * 1024 * 1024) errors.push(`${filename}: video exceeds 25 MB`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Content validation passed: content, assets, image metadata and dimensions, URLs, and video budgets are valid.");
