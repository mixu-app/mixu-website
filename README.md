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

## 站点技术栈

待定（M0 之后再选）。倾向：静态构建 + 极简依赖，中文排版优先，E-Ink/低带宽可用。
无论选什么，`just check` 必须仍然只依赖 markdownlint 就能跑通文档门禁。

## 质量门禁

```sh
just check     # markdownlint（文案也是代码）
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
