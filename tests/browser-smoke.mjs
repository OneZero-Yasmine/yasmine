import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const root = process.cwd();
const siteRoot = path.join(root, "_site");
const screenshotRoot = path.join(root, "tmp", "qa");
await mkdir(screenshotRoot, { recursive: true });

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    let relative = decodeURIComponent(url.pathname).replace(/^\/yasmine\/?/, "");
    if (!relative || relative.endsWith("/")) relative += "index.html";
    const file = path.resolve(siteRoot, relative);
    if (!file.startsWith(path.resolve(siteRoot))) throw new Error("unsafe path");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "content-type": mime[path.extname(file)] ?? "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}/yasmine`;
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function inspectPage(context, route, name) {
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const thirdPartyRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText ?? "unknown error";
    // preload="metadata" intentionally aborts the remaining media response
    // after browser metadata is available.
    if (request.resourceType() === "media" && error.includes("ERR_ABORTED")) return;
    failedRequests.push(`${request.url()}: ${error}`);
  });
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(base).origin) thirdPartyRequests.push(request.url());
  });

  const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  assert.equal(response?.ok(), true, `${route} should return 2xx`);
  await page.evaluate(async () => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    imagesReady: [...document.images].filter((image) => image.currentSrc).every((image) => image.complete && image.naturalWidth > 0)
  }));
  assert.ok(metrics.scrollWidth <= metrics.width, `${route} overflows horizontally: ${metrics.scrollWidth} > ${metrics.width}`);
  assert.equal(metrics.imagesReady, true, `${route} has an unloaded image`);
  assert.deepEqual(consoleErrors, [], `${route} console errors: ${consoleErrors.join(" | ")}`);
  assert.deepEqual(failedRequests, [], `${route} failed requests: ${failedRequests.join(" | ")}`);
  assert.deepEqual(thirdPartyRequests, [], `${route} loads third-party resources: ${thirdPartyRequests.join(" | ")}`);
  await page.screenshot({ path: path.join(screenshotRoot, `${name}.png`), fullPage: false });
  return page;
}

try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce"
  });
  for (const [route, name] of [
    ["/", "desktop-home"],
    ["/about/", "desktop-about"],
    ["/work/", "desktop-work"],
    ["/notes/", "desktop-notes"],
    ["/awards/", "desktop-awards"]
  ]) {
    const page = await inspectPage(desktop, route, name);
    if (route === "/about/") {
      const textLink = page.locator("a.book-toc__label").first();
      await textLink.hover();
      assert.equal(await textLink.evaluate((link) => getComputedStyle(link).textDecorationStyle), "wavy");

      assert.equal(await page.locator('a[href^="mailto:"]').count(), 0);
      await page.getByRole("button", { name: /点击复制邮箱地址/ }).click();
      await page.waitForFunction(() => document.querySelector("[data-copy-status]")?.textContent.trim());
      assert.match(await page.locator("[data-copy-status]").textContent(), /tansy7077@gmail\.com/);
    }
    if (route === "/awards/") {
      await page.getByRole("button", { name: "微信公众号" }).click();
      await assert.doesNotReject(page.locator("#wechat-official-account-dialog").waitFor({ state: "visible" }));
      await page.keyboard.press("Escape");
      await assert.doesNotReject(page.locator("#wechat-official-account-dialog").waitFor({ state: "hidden" }));
    }
    await page.close();
  }
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce"
  });
  const mobileHome = await inspectPage(mobile, "/", "mobile-home");
  await mobileHome.close();
  const mobileAbout = await inspectPage(mobile, "/about/", "mobile-about");
  await mobileAbout.locator(".life-photo--long").scrollIntoViewIfNeeded();
  await mobileAbout.waitForFunction(() => document.querySelector(".life-photo--long img")?.naturalWidth > 0);
  const travelPreview = await mobileAbout.locator(".life-photo--long").evaluate((figure) => {
    const link = figure.querySelector("a");
    const image = figure.querySelector("img");
    const bounds = image.getBoundingClientRect();
    return {
      href: link.getAttribute("href"),
      objectFit: getComputedStyle(image).objectFit,
      previewRatio: bounds.width / bounds.height,
      naturalRatio: image.naturalWidth / image.naturalHeight
    };
  });
  assert.equal(travelPreview.href, "/yasmine/assets/images/life/travel-comic-1024.webp");
  assert.equal(travelPreview.objectFit, "cover");
  assert.ok(Math.abs(travelPreview.previewRatio - 4 / 5) < 0.01);
  assert.ok(travelPreview.naturalRatio < 0.2);
  await mobileAbout.close();
  const mobileWork = await inspectPage(mobile, "/work/", "mobile-work");
  await mobileWork.close();
  const mobileNotes = await inspectPage(mobile, "/notes/", "mobile-notes");
  await mobileNotes.locator("summary").first().click();
  assert.equal(await mobileNotes.locator("details").first().getAttribute("open"), "");
  await mobileNotes.close();
  const mobileProject = await inspectPage(mobile, "/project/calculus-ai/", "mobile-project");
  const videoState = await mobileProject.locator("video").evaluate((video) => ({ paused: video.paused, autoplay: video.autoplay }));
  assert.deepEqual(videoState, { paused: true, autoplay: false });
  const slideState = await mobileProject.locator(".slide-card img").first().evaluate((image) => {
    const bounds = image.getBoundingClientRect();
    return {
      background: getComputedStyle(image).backgroundColor,
      displayedRatio: bounds.width / bounds.height,
      naturalRatio: image.naturalWidth / image.naturalHeight
    };
  });
  assert.equal(slideState.background, "rgba(0, 0, 0, 0)");
  assert.ok(Math.abs(slideState.displayedRatio - slideState.naturalRatio) < 0.01);
  await mobileProject.close();
  await mobile.close();

  console.log("Browser smoke tests passed at 1440x900 and 375x667.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
