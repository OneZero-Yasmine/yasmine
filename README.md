# Yasmine 的个人网站

基于 Eleventy 构建的静态网站。公开内容只使用用户明确确认的信息；本地私有资料与视觉稿中的示例内容不会直接进入成品。

完整的项目结构、内容边界、开发流程、测试、PR、CI 与发布规范见 [`项目.md`](项目.md)。参与开发或让 Agent 修改项目前，请先阅读该文档。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm test
```

输出目录为 `_site/`，GitHub Pages 子路径为 `/yasmine/`。推送到 `main` 后，GitHub Actions 会在构建与测试通过后自动发布。

## 维护者资产生成

`npm run assets` 仅供站点维护者使用，需要 `.gitignore` 中的本地私有素材，以及 PATH 中可用的 `ffmpeg` 和 `heif-convert`：

```bash
npm run assets
```

演示文稿先在本地导出为 PNG，再由脚本生成公开的 WebP 衍生图：

| 本地中间目录 | 内容 | 导出约定 |
|---|---|---|
| `tmp/source-render/calculus-ai/` | CalcAI 项目演示 | 1600×900，`slide-01.png` 起连续编号 |
| `tmp/source-render/tiger/` | Tiger Begins 项目演示 | 1600×900，`slide-01.png` 起连续编号 |
| `tmp/source-render/voxsee-review/` | Voxsee 评审材料 | 1600×900，`slide-01.png` 起连续编号 |
| `tmp/source-review/voxsee-pptx/` | Voxsee 项目故事 | 1600×900，`slide-01.png` 起连续编号 |

中间目录和原始演示文稿均不提交；脚本会用纸张背景补齐非 16:9 输入，不裁剪内容。

## 内容与版权

- 代码采用 MIT License。
- 个人文案、照片、视频、作品、演示文档及其他媒体由 Yasmine 保留全部权利。
- 原始资料保存在本地私有目录中，不应提交到公开仓库；公开站点只使用 `src/assets/` 中的网页优化衍生文件。
- `scripts/build-assets.mjs` 从本地母版生成网页资源；生成前不会改动原始资料。
