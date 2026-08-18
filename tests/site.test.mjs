import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const siteRoot = path.join(root, "_site");
const site = JSON.parse(await readFile(path.join(root, "src", "_data", "site.json"), "utf8"));
const projects = JSON.parse(await readFile(path.join(root, "src", "_data", "projects.json"), "utf8"));
const pages = [
  "index.html",
  "about/index.html",
  "work/index.html",
  "notes/index.html",
  "awards/index.html",
  "project/calculus-ai/index.html",
  "project/tiger/index.html",
  "project/time-widget/index.html",
  "project/voxsee/index.html",
  "404.html"
];

async function exists(location) {
  try {
    await access(location);
    return true;
  } catch {
    return false;
  }
}

function absoluteUrl(value) {
  return new URL(value.replace(/^\//, ""), site.baseUrl).href;
}

test("generates exactly the ten required page contracts", async () => {
  for (const page of pages) assert.equal(await exists(path.join(siteRoot, page)), true, `${page} should exist`);
});

test("sitemap contains every public page and excludes the 404 page", async () => {
  const xml = await readFile(path.join(siteRoot, "sitemap.xml"), "utf8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedPaths = [
    "/",
    "/about/",
    "/work/",
    "/notes/",
    "/awards/",
    ...projects.map((project) => `/project/${project.slug}/`)
  ];
  assert.equal(urls.length, 9);
  assert.deepEqual(new Set(urls), new Set(expectedPaths.map(absoluteUrl)));
  assert.equal(urls.some((url) => url.endsWith("/404.html")), false);
});

test("production HTML contains no visual-mock sample content", async () => {
  const forbidden = ["Ideas into Impact", "Competition Awards", "How I remember link and image", "CONTENT_TODO"];
  for (const page of pages) {
    const html = await readFile(path.join(siteRoot, page), "utf8");
    for (const token of forbidden) assert.equal(html.includes(token), false, `${page} contains ${token}`);
  }
});

test("public pages omit private identity and planning context", async () => {
  const privateTokens = [
    String.fromCodePoint(0x4f55, 0x4f9d, 0x9716),
    String.fromCodePoint(0x63a8, 0x514d),
    String.fromCodePoint(0x4fdd, 0x7814),
    "potential employer"
  ];
  for (const page of pages) {
    const html = await readFile(path.join(siteRoot, page), "utf8");
    for (const token of privateTokens) assert.equal(html.toLowerCase().includes(token), false, `${page} contains private context`);
  }
});

test("every page uses the confirmed canonical base", async () => {
  for (const page of pages) {
    const html = await readFile(path.join(siteRoot, page), "utf8");
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical?.startsWith(site.baseUrl), true);
    assert.equal(html.includes("/personal-website/"), false);
  }
});

test("project pages use dedicated self-hosted JPEG share images", async () => {
  for (const project of projects) {
    const relative = `assets/images/og/projects/${project.slug}.jpg`;
    const html = await readFile(path.join(siteRoot, "project", project.slug, "index.html"), "utf8");
    assert.match(html, new RegExp(`<meta property="og:image" content="${absoluteUrl(`/${relative}`)}">`));
    assert.equal(await exists(path.join(siteRoot, relative)), true);
    assert.match(project.video.poster, /\.webp$/);
    assert.match(project.ogImage, /\.jpg$/);
  }
});

test("navigation excludes Research and renumbers the remaining sections", async () => {
  const html = await readFile(path.join(siteRoot, "index.html"), "utf8");
  assert.doesNotMatch(html, />Research</);
  assert.match(html, />Notes<\/a>[\s\S]*?>III<\/span>/);
  assert.match(html, />Awards<\/a>[\s\S]*?>IV<\/span>/);
});

test("contact controls use the confirmed public contact details", async () => {
  const html = await readFile(path.join(siteRoot, "about/index.html"), "utf8");
  assert.doesNotMatch(html, /href="mailto:/);
  assert.match(html, /data-copy-email="tansy7077@gmail\.com"/);
  assert.doesNotMatch(html, /data-copy-email="1[3-9]\d{9}@/);
  assert.doesNotMatch(html, />复制<\/button>/);
  for (const name of ["email", "wechat", "xiaohongshu", "github"]) {
    assert.match(html, new RegExp(`icon-${name}\\.png`));
  }
  assert.match(html, />微信公众号<\/span>/);
  assert.match(html, /id="wechat-official-account-dialog"/);
  assert.match(html, />碳基生物反思日志<\/h2>/);
  assert.match(html, /alt="碳基生物反思日志微信公众号二维码"/);
  assert.match(html, /微信公众号：碳基生物反思日志/);
  assert.doesNotMatch(html, /assets\/images\/contact\/wechat\.webp/);
});

test("project slide sections omit the descriptive line below their heading", async () => {
  const descriptions = [
    "15 页材料依次呈现项目背景、产品概念、功能、技术实现和实践过程。",
    "7 页材料呈现项目概览、流程、设计亮点、IP 系统和两类核心交互。",
    "8 页材料回顾从创业动机、需求调研到项目成果与个人成长的过程。",
    "13 页材料记录赛事选择、评分理解、团队、知识库、项目推进和心态复盘。"
  ];
  for (const page of ["project/calculus-ai/index.html", "project/tiger/index.html", "project/voxsee/index.html"]) {
    const html = await readFile(path.join(siteRoot, page), "utf8");
    for (const description of descriptions) assert.equal(html.includes(description), false);
  }
});

test("every project Overview identifies the role and specific contribution without a Demo Film subtitle", async () => {
  const expected = new Map([
    ["project/calculus-ai/index.html", ["产品经理 · 项目经理", "课程作业管理、错题统计、习题练习三大功能板块"]],
    ["project/tiger/index.html", ["产品经理 · 项目经理", "负责四人团队的任务分工与项目推进"]],
    ["project/time-widget/index.html", ["独立创作者 · Vibe Coding", "借助 AI Studio 进行 Vibe Coding"]],
    ["project/voxsee/index.html", ["创始人 · 项目经理 · 产品经理", "管理商业、设计、技术三支团队推进项目"]]
  ]);
  for (const [page, phrases] of expected) {
    const html = await readFile(path.join(siteRoot, page), "utf8");
    assert.match(html, />Role<\/span>/);
    assert.match(html, />What I did<\/p>/);
    for (const phrase of phrases) assert.equal(html.includes(phrase), true, `${page} should include ${phrase}`);
    assert.doesNotMatch(html, /点击播放完整视频/);
    assert.doesNotMatch(html, /\d{2}:\d{2} ·/);
  }
});

test("About uses the confirmed Life Photos captions and keeps the travel comic linked to its full image", async () => {
  const html = await readFile(path.join(siteRoot, "about/index.html"), "utf8");
  for (const caption of [
    "在老友记咖啡馆的SmellyCat小蛋糕",
    "在Ceol咖啡馆的健康午餐!",
    "跟crush们过生日",
    "是本人",
    "丽水旅游小记",
    "日主甲木-食神格-喜木水"
  ]) {
    assert.match(html, new RegExp(caption));
  }
  assert.match(html, /class="framed-media life-photo life-photo--long"[\s\S]*?href="\/yasmine\/assets\/images\/life\/travel-comic-1024\.webp"/);
});

test("About omits the PDF resume and private academic scores", async () => {
  const html = await readFile(path.join(siteRoot, "about/index.html"), "utf8");
  assert.doesNotMatch(html, /yasmine-resume-public\.pdf/);
  assert.doesNotMatch(html, /查看公开版简历/);
  assert.doesNotMatch(html, /\bGPA\b/i);
  assert.doesNotMatch(html, /绩点/);
  assert.doesNotMatch(html, /\b\d{1,3}(?:\.\d{1,2})?\/(?:4(?:\.\d{1,2})?|100)\b/);
  assert.equal(await exists(path.join(siteRoot, "assets/documents/yasmine-resume-public.pdf")), false);
});

test("every visible page title uses the confirmed Creator For the World subtitle", async () => {
  for (const page of pages) {
    const html = await readFile(path.join(siteRoot, page), "utf8");
    assert.equal(html.includes("Creator For the World"), true, `${page} should include the shared subtitle`);
  }
});

test("About includes the concise Personal Statement without a separate project-link group", async () => {
  const html = await readFile(path.join(siteRoot, "about/index.html"), "utf8");
  assert.match(html, /<h2 id="personal-statement"[^>]*>Personal Statement<\/h2>/);
  assert.equal(html.includes("我是 Yasmine，是浙江大学会计学本科生。"), true);
  assert.doesNotMatch(html, /class="about-project-links"/);
  assert.equal(html.includes("CalcAI 微积分AI助教"), true);
});

test("Work uses the confirmed project names and preserves resume internship and research text without tags", async () => {
  const html = await readFile(path.join(siteRoot, "work/index.html"), "utf8");
  for (const title of [
    "CalcAI 微积分AI助教",
    "Tiger Begins 小虎起势",
    "Time Widget 桌面摆件",
    "Voxsee 面向视障者的智能辅具"
  ]) assert.equal(html.includes(title), true, `Work should include ${title}`);

  assert.doesNotMatch(html, /aria-label="项目关键词"/);
  for (const phrase of [
    "团队面向政府进行钉钉与千问办公(办公桌面智能体)等相关产品的销售与解决方案提供。",
    "一对一访谈与基层调研",
    "舆情监测、入户走访、台账填写、失业帮扶",
    "招标筛选与推送skill",
    "社工用该poc顺利完成了50+通电话拨打。",
    "prompt模板设计",
    "最终产出浙江省余杭区法院专属纪要prompt，并得到客户采用。",
    "帆软是一家BI领域市场占率第一、专注于商业智能与大数据分析的平台提供商。",
    "Agent搭建与开发平台功能对比",
    "基于以上分析结果输出“AI+BI”行业发展报告与公司短-中-长期战略报告。"
  ]) assert.equal(html.includes(phrase), true, `Work should preserve ${phrase}`);
  assert.equal(html.includes("入户走访管家skill"), false);
  assert.equal(html.includes("社工主动告知失业帮扶场景下打电话的痛点"), false);

  assert.doesNotMatch(html, /aria-label="研究关键词"/);
  for (const phrase of [
    "本项目聚焦市值管理政策新规出台之后，受影响公司在投资者互动平台上的回复行为是否趋善。",
    "文献研究与课题提出",
    "变量处理与模型构建",
    "构建“答非所问”程度、语调等量化指标",
    "项目已成功立项浙江大学校级SRTP项目，目前已进入收尾阶段。"
  ]) assert.equal(html.includes(phrase), true, `Work should preserve ${phrase}`);
});

test("internal links and assets resolve under the GitHub Pages path prefix", async () => {
  for (const page of pages) {
    const html = await readFile(path.join(siteRoot, page), "utf8");
    const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    for (const link of links) {
      if (!link.startsWith("/yasmine/")) continue;
      const clean = link.replace(/^\/yasmine\//, "").split(/[?#]/)[0];
      if (!clean) {
        assert.equal(await exists(path.join(siteRoot, "index.html")), true);
        continue;
      }
      const target = clean.endsWith("/") ? path.join(siteRoot, clean, "index.html") : path.join(siteRoot, clean);
      assert.equal(await exists(target), true, `${page}: ${link} should resolve`);
    }
  }
});

test("private source-material directory is never copied to the production site", async () => {
  const rootEntries = await readdir(siteRoot);
  assert.equal(rootEntries.some((entry) => entry.includes("真实详细资料")), false);
});
