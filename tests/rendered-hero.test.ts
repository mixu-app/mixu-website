import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseHeroMarkdown, renderHero, renderHeroHtml } from "../scripts/render-hero.ts";

const contentUrl = new URL("../content/hero.zh-CN.md", import.meta.url);
const rawMarkdown = await Bun.file(contentUrl).text();
const heroData = parseHeroMarkdown(rawMarkdown);
const renderedHtml = renderHeroHtml(heroData);

describe("rendered hero content", () => {
  test("contains the headline verbatim", () => {
    expect(renderedHtml).toContain("记住每一个线索，推理留给你。");
  });

  test("contains the subhead verbatim", () => {
    expect(renderedHtml).toContain("谜序是一款离线优先的悬疑阅读器。它把");
    expect(renderedHtml).toContain("你已经读到的内容");
    expect(renderedHtml).toContain("整理成一张可点击的案情板——");
    expect(renderedHtml).toContain("人物、地点、事件、各执一词的证词，都能跳回原文。它不剧透，不猜凶手，也不替你推理。");
  });

  test("contains the three core values verbatim", () => {
    // Value 1
    expect(renderedHtml).toContain("只显示你读过的。");
    expect(renderedHtml).toContain("案情板按阅读进度过滤：读到第 10 章，就看不到第 14 章才揭晓的身份。");

    // Value 2
    expect(renderedHtml).toContain("点一下，回到原句。");
    expect(renderedHtml).toContain("每条信息都带原文定位，跳过去、再跳回来，位置不丢。");

    // Value 3
    expect(renderedHtml).toContain("不登录也能读完一本书。");
    expect(renderedHtml).toContain("导入、阅读、书签、笔记、已下载的图包，全部离线可用。");
    expect(renderedHtml).toContain("E-Ink 设备用同一个安装包，只是少一点动画。");
  });

  test("contains who it is for verbatim", () => {
    expect(renderedHtml).toContain("人物多、时间线绕、隔几天再读就忘了\"这人是谁\"的长篇推理读者。");
    expect(renderedHtml).toContain("喜欢自己做笔记、自己列嫌疑人表的读者。");
    expect(renderedHtml).toContain("用墨水屏、只想安静读完一本书的读者。");
  });

  test("contains honest limitations verbatim", () => {
    expect(renderedHtml).toContain("想要\"AI 直接告诉我凶手\"的人：这是产品原则之外的功能。");
    expect(renderedHtml).toContain("想要在线阅读、下载书源、绕过 DRM 的人：这不是阅读器的定位。");
  });

  test("contains CTAs verbatim", () => {
    expect(renderedHtml).toContain("看看它怎么工作");
    expect(renderedHtml).toContain("（跳到 3 步演示）");
    expect(renderedHtml).toContain("在 GitHub 上看客户端");
    expect(renderedHtml).toContain("（公开客户端仓库）");
  });

  test("contains mandatory footer disclaimers verbatim", () => {
    expect(renderedHtml).toContain("谜序当前处于开发阶段，本站描述的是设计目标，不是已发布功能。");
    expect(renderedHtml).toContain("「不剧透」是工程目标：按阅读进度做确定性过滤，并有可失败的回归测试；它不等于数学保证。");
    expect(renderedHtml).toContain("客户端代码开源（Apache-2.0），托管服务与图库另计；书名、品牌与第三方图书内容不在开源许可内。");
  });

  test("fails when content file is missing", () => {
    const nonexistentPath = resolve(import.meta.dir, "../content/nonexistent-hero.md");
    expect(() => renderHero(nonexistentPath)).toThrow(/Missing content file/);
  });

  test("fails when required section is missing", () => {
    const incompleteMarkdown = "# Test\n\n## 主标题\n\n**仅有标题**\n";
    expect(() => parseHeroMarkdown(incompleteMarkdown)).toThrow(/Missing required section/);
  });

  test("template target (src/index.html) contains verbatim hero copy", async () => {
    const indexHtml = await Bun.file(new URL("../src/index.html", import.meta.url)).text();
    expect(indexHtml).toContain("记住每一个线索，推理留给你。");
    expect(indexHtml).toContain("只显示你读过的。");
    expect(indexHtml).toContain("点一下，回到原句。");
    expect(indexHtml).toContain("不登录也能读完一本书。");
    expect(indexHtml).toContain("人物多、时间线绕、隔几天再读就忘了\"这人是谁\"的长篇推理读者。");
    expect(indexHtml).toContain("想要\"AI 直接告诉我凶手\"的人：这是产品原则之外的功能。");
    expect(indexHtml).toContain("看看它怎么工作");
    expect(indexHtml).toContain("在 GitHub 上看客户端");
    expect(indexHtml).toContain("不等于数学保证");
  });

  test("built page (dist/index.html) contains verbatim hero copy", async () => {
    const indexPath = resolve(import.meta.dir, "../src/index.html");
    const distPath = resolve(import.meta.dir, "../dist/index.html");

    await Bun.build({
      entrypoints: [indexPath],
      outdir: resolve(import.meta.dir, "../dist"),
      minify: true,
    });

    expect(existsSync(distPath)).toBe(true);
    const distHtml = await Bun.file(distPath).text();
    expect(distHtml).toContain("记住每一个线索，推理留给你。");
    expect(distHtml).toContain("只显示你读过的。");
    expect(distHtml).toContain("点一下，回到原句。");
    expect(distHtml).toContain("不登录也能读完一本书。");
    expect(distHtml).toContain("人物多、时间线绕、隔几天再读就忘了\"这人是谁\"的长篇推理读者。");
    expect(distHtml).toContain("想要\"AI 直接告诉我凶手\"的人：这是产品原则之外的功能。");
    expect(distHtml).toContain("看看它怎么工作");
    expect(distHtml).toContain("在 GitHub 上看客户端");
    expect(distHtml).toContain("不等于数学保证");
  });
});
