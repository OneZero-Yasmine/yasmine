import { execFile } from "node:child_process";
import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const exec = promisify(execFile);
const root = process.cwd();
const sourceRoot = path.join(root, "10的真实详细资料");
const outRoot = path.join(root, "src", "assets");
const tmpRoot = path.join(root, "tmp", "asset-build");

const at = (...parts) => path.join(root, ...parts);
const source = (...parts) => path.join(sourceRoot, ...parts);
const out = (...parts) => path.join(outRoot, ...parts);

async function ensure(...directories) {
  await Promise.all(directories.map((directory) => mkdir(directory, { recursive: true })));
}

async function run(command, args) {
  const result = await exec(command, args, { cwd: root, windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
  if (result.stderr?.trim()) process.stdout.write(result.stderr);
}

async function webp(input, output, width, quality = 78) {
  await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toFile(output);
}

async function copyDecor() {
  const from = at("素材", "加工后");
  const to = out("images", "decor");
  await ensure(to);
  for (const filename of ["paper-tile.webp", "corner.png", "divider-title.png", "divider-toc.png", "flourish.png"]) {
    await cp(path.join(from, filename), path.join(to, filename), { force: true });
  }
}

async function copyFonts() {
  const fontDir = out("fonts");
  const fileDir = out("fonts", "files");
  await ensure(fontDir, fileDir);

  await cp(at("node_modules", "@fontsource", "noto-serif-sc", "400.css"), path.join(fontDir, "noto-serif-sc.css"), { force: true });
  const notoFiles = await readdir(at("node_modules", "@fontsource", "noto-serif-sc", "files"));
  for (const filename of notoFiles.filter((name) => name.endsWith("-400-normal.woff2"))) {
    await cp(at("node_modules", "@fontsource", "noto-serif-sc", "files", filename), path.join(fileDir, filename), { force: true });
  }

  for (const weight of [400, 500]) {
    const filename = `cormorant-garamond-latin-${weight}-normal.woff2`;
    await cp(at("node_modules", "@fontsource", "cormorant-garamond", "files", filename), path.join(fontDir, filename), { force: true });
  }
}

async function buildContact() {
  const dir = out("images", "contact");
  await ensure(dir);
  await webp(source("微信公众号-碳基生物反思日志.jpeg"), path.join(dir, "wechat-official-account.webp"), 430, 82);
  await webp(source("小红书联系方式.jpg"), path.join(dir, "xiaohongshu.webp"), 640, 82);
}

async function decodeHeic(filename, outputName) {
  const output = path.join(tmpRoot, outputName);
  const located = await exec("where.exe", ["heif-convert"], { windowsHide: true });
  const converter = located.stdout.split(/\r?\n/).find(Boolean);
  if (!converter) throw new Error("heif-convert was not found in PATH");
  await run(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", converter, source("About页参考资料", "Life照片", filename), output]);
  return output;
}

async function buildLife() {
  const dir = out("images", "life");
  await ensure(dir, tmpRoot);
  const cake = await decodeHeic("蛋糕.heic", "cake.jpg");
  const food = await decodeHeic("美食.heic", "food.jpg");
  const items = [
    { input: cake, name: "cake", large: 960 },
    { input: food, name: "food", large: 960 },
    { input: source("About页参考资料", "Life照片", "生日故事.jpg"), name: "birthday-story", large: 960 },
    { input: source("About页参考资料", "Life照片", "漫画头像.jpg"), name: "comic-avatar", large: 960 },
    { input: source("About页参考资料", "Life照片", "旅游漫画故事.jpg"), name: "travel-comic", large: 1024 },
    { input: source("About页参考资料", "Life照片", "五行-公开版.jpeg"), name: "wuxing", large: 960 }
  ];

  for (const item of items) {
    await webp(item.input, path.join(dir, `${item.name}-480.webp`), 480, 76);
    await webp(item.input, path.join(dir, `${item.name}-${item.large}.webp`), item.large, item.name === "travel-comic" ? 72 : 80);
  }
}

async function splitArticle(input, basename, count) {
  const dir = out("images", "notes");
  const resized = await sharp(input).resize({ width: 1200 }).png().toBuffer();
  const metadata = await sharp(resized).metadata();
  await sharp(resized).webp({ quality: 74, effort: 5 }).toFile(path.join(dir, `${basename}-full.webp`));

  const segmentHeight = Math.floor(metadata.height / count);
  for (let index = 0; index < count; index += 1) {
    const top = index * segmentHeight;
    const height = index === count - 1 ? metadata.height - top : segmentHeight;
    await sharp(resized)
      .extract({ left: 0, top, width: metadata.width, height })
      .webp({ quality: 74, effort: 5 })
      .toFile(path.join(dir, `${basename}-${String(index + 1).padStart(2, "0")}.webp`));
  }
}

async function buildNotes() {
  await ensure(out("images", "notes"));
  await splitArticle(source("Notes页参考资料", "2025年《请认识我》.png"), "please-know-me", 4);
  await splitArticle(source("Notes页参考资料", "2025年《请听我的一些想法与故事》.png"), "thoughts-and-stories", 3);
}

function numericSort(a, b) {
  const number = (value) => Number(value.match(/(\d+)(?=\.png$)/)?.[1] ?? 0);
  return number(a) - number(b);
}

async function convertSlides(inputDir, outputDir) {
  await ensure(outputDir);
  const files = (await readdir(inputDir)).filter((name) => /^slide-\d+\.png$/.test(name)).sort(numericSort);
  if (!files.length) throw new Error(`No slide renders found in ${inputDir}`);
  for (let index = 0; index < files.length; index += 1) {
    await webp(path.join(inputDir, files[index]), path.join(outputDir, `slide-${String(index + 1).padStart(2, "0")}.webp`), 1600, 78);
  }
}

async function buildSlides() {
  await convertSlides(at("tmp", "source-render", "calculus-ai"), out("slides", "calculus-ai"));
  await convertSlides(at("tmp", "source-render", "tiger"), out("slides", "tiger"));
  await convertSlides(at("tmp", "source-render", "voxsee-review"), out("slides", "voxsee-review"));
  await convertSlides(at("tmp", "source-review", "voxsee-pptx"), out("slides", "voxsee-story"));
}

const videos = [
  {
    input: source("Work页参考资料", "CalcuAI-微积分AI助教", "微积分AI助教产品展示.mp4"),
    name: "calculus-ai",
    scale: "scale='min(1280,iw)':-2",
    crf: "27",
    posterTime: "00:00:03"
  },
  {
    input: source("Work页参考资料", "小虎起势Tiger Begins", "介绍视频.mp4"),
    name: "tiger",
    scale: "scale='min(1280,iw)':-2",
    crf: "27",
    posterTime: "00:00:03"
  },
  {
    input: source("Work页参考资料", "桌面摆件Time Widget", "介绍视频.mp4"),
    name: "time-widget",
    scale: "scale='min(1280,iw)':-2",
    crf: "26",
    posterTime: "00:00:02"
  },
  {
    input: source("Work页参考资料", "Voxsee-面向视障者的普惠级无障碍智能硬件", "产品视频.mp4"),
    name: "voxsee",
    scale: "scale='min(1280,iw)':-2",
    crf: "25",
    posterTime: "00:00:01"
  }
];

async function buildVideos() {
  const videoDir = out("video");
  const posterDir = out("images", "posters");
  await ensure(videoDir, posterDir, tmpRoot);
  for (const video of videos) {
    const output = path.join(videoDir, `${video.name}.mp4`);
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", video.input,
      "-map", "0:v:0", "-map", "0:a?", "-vf", video.scale,
      "-c:v", "libx264", "-preset", "medium", "-crf", video.crf,
      "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
      "-movflags", "+faststart", output
    ]);
    const posterPng = path.join(tmpRoot, `${video.name}-poster.png`);
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", video.posterTime, "-i", output, "-frames:v", "1", posterPng]);
    await webp(posterPng, path.join(posterDir, `${video.name}.webp`), 1280, 82);
  }

  // The CalcuAI video opens directly on a dense product screen. Its real title
  // slide makes a clearer static poster while the full video remains unchanged.
  await webp(out("slides", "calculus-ai", "slide-02.webp"), path.join(posterDir, "calculus-ai.webp"), 1280, 82);
}

async function buildOgImages() {
  const ogDir = out("images", "og", "projects");
  await ensure(ogDir);
  for (const video of videos) {
    await sharp(out("images", "posters", `${video.name}.webp`))
      .resize({ width: 1200, height: 630, fit: "contain", background: "#e8dbcd" })
      .flatten({ background: "#e8dbcd" })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(path.join(ogDir, `${video.name}.jpg`));
  }
}

async function verifyBudget() {
  for (const video of videos) {
    const file = out("video", `${video.name}.mp4`);
    const info = await stat(file);
    if (info.size > 25 * 1024 * 1024) throw new Error(`${video.name}.mp4 exceeds 25 MB`);
  }
}

await ensure(outRoot, tmpRoot);
await copyDecor();
await copyFonts();
await buildContact();
await buildLife();
await buildNotes();
await buildSlides();
await buildVideos();
await buildOgImages();
await verifyBudget();

console.log("Web assets generated from the confirmed local source materials.");
