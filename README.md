# mixu-website

谜序（Mixu）的落地页与文案仓库。**当前处于文案阶段，站点尚未构建**——先定清楚
"我们承诺什么、不承诺什么"，再写页面。

## 现在有什么

```text
content/hero.zh-CN.md     # Hero 页文案草案（中文，面向读者）
content/README.md         # 文案规则：能说什么、不能说什么
```

## 文案红线

- 不写"已上线/已支持"的功能。产品当前是文档阶段，任何完成度声明都必须能对应到里程碑。
- 不演示真实书籍的剧透图。演示素材只能用 `mixu-fixtures` 的原创语料。
- 不承诺"100% 不剧透"。准确表述是：**按阅读进度过滤，并有可失败的回归测试**；
  AI 已知名著结局属于已记录的风险（R-01）。
- 不把"开源"说成"免费云服务"。代码许可 ≠ 托管服务、品牌与图库可自由复制。

## 站点技术栈：只用 bun

```text
src/index.html    静态页面（中文排版优先，无框架运行时）
src/main.ts       少量渐进增强，能力探测后才启用
src/style.css     CSS，尊重 prefers-reduced-motion / color-scheme
tests/            bun test：守住文案里必须保留的声明
```

- **没有** webpack / vite / React / 独立 ESLint / Prettier / Biome。需要的能力优先用 bun
  自带（`bun build`、`bun test`、`bun --hot`）；`tsc` 只做类型检查。
- 依赖只有两个 devDependency（`typescript`、`@types/bun`），`bunfig.toml` 里 `exact = true`。
  `bun.lock` 目前未提交：生成它的机器上 bun 会 segfault；bun 修好后先跑 `bun install`
  提交 lock，再把 `justfile` 与 CI 切成 `--frozen-lockfile`。
- 命令：`bun install` → `bun run dev` / `bun run check`；`just check` 依次跑
  markdownlint、typecheck、test、build。

### 本机已知缺陷：bun 段错误

在这台机器上 `bun` / `bunx` 会 segfault（rc=139）并且**不输出任何内容**——那看起来像"通过"。
因此规则是：**静默的 bun 运行一律视为失败**，以 CI 为准（CI 用 `oven-sh/setup-bun`）。
需要本地验证类型时用 `just node-typecheck`（`npx tsc --noEmit`）。

## 质量门禁

```sh
just check          # markdownlint + bun(typecheck/test/build)
just node-typecheck # 本机 bun 坏掉时的类型检查回退
```

## 相关文档

- 定位：[mixu-docs · 产品简报](https://github.com/mixu-app/mixu-docs/blob/main/docs/product/product-brief.md)
- 开源边界：[mixu-docs · 开源策略](https://github.com/mixu-app/mixu-docs/blob/main/docs/open-source-strategy.md)

## English

Landing page copy and (later) the site for Mixu. Copy rules live in
`content/README.md`; the site build is deferred until the M0 reader is real.

## 许可证

代码与站点构建脚本：[Apache-2.0](LICENSE)。文案与品牌素材不在代码许可范围内，
转载需授权。
