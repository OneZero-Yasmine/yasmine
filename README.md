# Yasmine 何依霖的个人网站

基于 Eleventy 的静态个人作品集。网站内容只来自 `10的真实详细资料/` 与用户确认的信息；视觉稿中的示例内容不会进入成品。

## 本地运行

```bash
npm install
npm run assets
npm run dev
```

生产构建：

```bash
npm run build
npm test
```

输出目录为 `_site/`，GitHub Pages 子路径为 `/yasmine/`。推送到 `main` 后，GitHub Actions 会在构建与测试通过后自动发布。

## 内容与版权

- 代码采用 MIT License。
- 个人文案、照片、视频、作品、演示文档及其他媒体由 Yasmine 何依霖保留全部权利。
- 原始资料保存在本地私有目录中，不应提交到公开仓库；公开站点只使用 `src/assets/` 中的网页优化衍生文件。
- `scripts/build-assets.mjs` 从本地母版生成网页资源；生成前不会改动原始资料。
