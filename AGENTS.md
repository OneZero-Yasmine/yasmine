# 项目级 Agent 规则

## 项目定位

这是 Yasmine 何依霖的 Eleventy 静态个人作品集，部署到 GitHub Pages 的 `/yasmine/` 子路径。开始工作前必须完整阅读 `项目.md`；详细规范以该文件为准。

## 运行与验证

- 安装：`npm install`
- 本地预览：`npm run dev`
- 完整门禁：先运行 `npm run build`，再运行 `npm test`
- 不得通过删除测试、放宽断言或提交 `_site/` 来绕过失败。

## 技术栈与目录

- Eleventy 3、Nunjucks、原生 CSS、原生 JavaScript。
- 生产内容在 `src/_data/`，模板在 `src/` 与 `src/_includes/`，公开资源在 `src/assets/`。
- `_site/` 与 `tmp/` 是生成物；原始私人资料和设计参考目录不得提交。

## 修改约束

- 只使用用户明确确认的真实资料，不编造内容、链接、经历或占位项。
- 最小化改动，复用现有组件和样式，不顺手重构无关代码。
- 所有路径必须兼容 `/yasmine/`，不要散落手写仓库前缀。
- 内容、架构、命令、测试或部署规则改变时，在同一 PR 更新 `项目.md`；快速使用方式改变时同步更新 `README.md`。

## Git 与发布

- 不直接修改或推送 `main`；从最新 `main` 创建 `codex/<任务名>` 分支。
- 所有改动经 PR、`build-and-test` CI、对话解决后才能合并。
- 不绕过分支保护，不强推或删除 `main`。
- 合并只表示代码已进入 `main`；还要等待部署成功并验证线上页面。
