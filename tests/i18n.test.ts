// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseHeroMarkdown, renderAllHeroPages, renderHeroHtml } from "../scripts/render-hero.ts";
import { run as runDownload } from "../scripts/render-download.ts";
import { run as run404 } from "../scripts/render-404.ts";
import { getLocaleConfig, getSiteConfig, renderLangSwitcher } from "../scripts/site-config.ts";

const rootDir = resolve(import.meta.dir, "..");
const srcDir = resolve(rootDir, "src");
const distDir = resolve(rootDir, "dist");

describe("i18n configuration and extensible dictionary", () => {
  const cfg = getSiteConfig();

  test("loads three supported locales: zh-CN, en, ja", () => {
    expect(cfg.supportedLocales).toEqual(["zh-CN", "en", "ja"]);
    expect(cfg.defaultLocale).toBe("zh-CN");
  });

  test("provides complete UI dictionaries for each supported locale", () => {
    for (const locale of ["zh-CN", "en", "ja"]) {
      const locCfg = getLocaleConfig(locale, cfg);
      expect(locCfg.siteName).toBeTruthy();
      expect(locCfg.tagline).toBeTruthy();
      expect(locCfg.ui).toBeDefined();
      expect(locCfg.ui?.hero?.valuesHeading).toBeTruthy();
      expect(locCfg.ui?.hero?.audienceHeading).toBeTruthy();
      expect(locCfg.ui?.hero?.limitationsHeading).toBeTruthy();
      expect(locCfg.ui?.download?.heading).toBeTruthy();
      expect(locCfg.ui?.download?.verificationHeading).toBeTruthy();
      expect(locCfg.ui?.notFound?.homeLink).toBeTruthy();
    }
  });

  test("renders accessible language switcher with proper links and active state", () => {
    const switcherZh = renderLangSwitcher("zh-CN", "index", cfg);
    expect(switcherZh).toContain('<nav class="lang-switcher" aria-label="Language">');
    expect(switcherZh).toContain('href="/" class="active" aria-current="page"');
    expect(switcherZh).toContain('href="/en/"');
    expect(switcherZh).toContain('href="/ja/"');

    const switcherEn = renderLangSwitcher("en", "download", cfg);
    expect(switcherEn).toContain('href="/download.html"');
    expect(switcherEn).toContain('href="/en/download.html" class="active" aria-current="page"');
    expect(switcherEn).toContain('href="/ja/download.html"');

    const switcherJa = renderLangSwitcher("ja", "notFound", cfg);
    expect(switcherJa).toContain('href="/404.html"');
    expect(switcherJa).toContain('href="/en/404.html"');
    expect(switcherJa).toContain('href="/ja/404.html" class="active" aria-current="page"');
  });
});

describe("markdown parser multi-locale support", () => {
  test("parses Chinese hero content correctly", () => {
    const rawZh = readFileSync(resolve(rootDir, "content/hero.zh-CN.md"), "utf-8");
    const data = parseHeroMarkdown(rawZh);
    expect(data.headline).toBe("记住每一个线索，推理留给你。");
    expect(data.ctas.length).toBeGreaterThanOrEqual(2);
    expect(data.ctas[0]?.isPrimary).toBe(true);
  });

  test("parses English hero content correctly", () => {
    const rawEn = readFileSync(resolve(rootDir, "content/hero.en.md"), "utf-8");
    const data = parseHeroMarkdown(rawEn);
    expect(data.headline).toBe("Remember every clue. The deduction is yours.");
    expect(data.ctas.length).toBeGreaterThanOrEqual(2);
    expect(data.ctas[0]?.isPrimary).toBe(true);
    expect(data.ctas[0]?.label).toBe("See how it works");
    expect(data.ctas[1]?.label).toBe("View client on GitHub");
  });

  test("parses Japanese hero content correctly", () => {
    const rawJa = readFileSync(resolve(rootDir, "content/hero.ja.md"), "utf-8");
    const data = parseHeroMarkdown(rawJa);
    expect(data.headline).toBe("すべての手がかりを記録し、推理はあなたに。");
    expect(data.ctas.length).toBeGreaterThanOrEqual(2);
    expect(data.ctas[0]?.isPrimary).toBe(true);
    expect(data.ctas[0]?.label).toBe("仕組みを見る");
    expect(data.ctas[1]?.label).toBe("GitHub でクライアントを見る");
  });
});

describe("multi-locale hero page rendering", () => {
  beforeAll(() => {
    renderAllHeroPages();
  });

  test("zh-CN hero page renders with Chinese headings, metadata, and alt text", () => {
    const html = readFileSync(resolve(srcDir, "index.html"), "utf-8");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("记住每一个线索，推理留给你。");
    expect(html).toContain("<h2>三条价值</h2>");
    expect(html).toContain("<h2>适合谁</h2>");
    expect(html).toContain("<h2>不适合谁（诚实说明）</h2>");
    expect(html).toContain('alt="谜序 Mixu"');
    expect(html).toContain('<link rel="canonical" href="https://mixuread.com/" />');
    expect(html).toContain('property="og:locale" content="zh_CN"');
  });

  test("en hero page renders with English headings, metadata, and alt text", () => {
    const html = readFileSync(resolve(srcDir, "en/index.html"), "utf-8");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Remember every clue. The deduction is yours.");
    expect(html).toContain("<h2>Core Values</h2>");
    expect(html).toContain("<h2>Who It Is For</h2>");
    expect(html).toContain("<h2>Who It Is Not For (Honest Limitations)</h2>");
    expect(html).toContain('alt="Mixu"');
    expect(html).toContain('<link rel="canonical" href="https://mixuread.com/en/" />');
    expect(html).toContain('property="og:locale" content="en_US"');
  });

  test("ja hero page renders with Japanese headings, metadata, and alt text", () => {
    const html = readFileSync(resolve(srcDir, "ja/index.html"), "utf-8");
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("すべての手がかりを記録し、推理はあなたに。");
    expect(html).toContain("<h2>3つの価値</h2>");
    expect(html).toContain("<h2>対象読者</h2>");
    expect(html).toContain("<h2>対象外の方（誠実な説明）</h2>");
    expect(html).toContain('alt="Mixu (ミクス)"');
    expect(html).toContain('<link rel="canonical" href="https://mixuread.com/ja/" />');
    expect(html).toContain('property="og:locale" content="ja_JP"');
  });

  test("en hero page contains zero Chinese characters outside language switcher", () => {
    const html = readFileSync(resolve(srcDir, "en/index.html"), "utf-8");
    const stripped = html.replace(/<nav class="lang-switcher"[^>]*>[\s\S]*?<\/nav>/, "");
    const hanMatch = stripped.match(/[\u4e00-\u9fa5]/);
    expect(hanMatch).toBeNull();
  });
});

describe("multi-locale download page rendering", () => {
  beforeAll(() => {
    runDownload();
  });

  test("zh-CN download page renders honestly with Chinese copy and verification guide", () => {
    const html = readFileSync(resolve(srcDir, "download.html"), "utf-8");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("客户端下载");
    expect(html).toContain("v0.0.1");
    expect(html).toContain("a22ec1fa93c5b1d7f37abc7ab18544f39cc4f82246b1494b36cb2c50eeb9f9cb");
    expect(html).toContain("安装包真实性与签名校验");
    expect(html).toContain("SHA-256 校验和");
    expect(html).toContain("apksigner");
  });

  test("en download page renders with English copy and zero Chinese characters outside switcher", () => {
    const html = readFileSync(resolve(srcDir, "en/download.html"), "utf-8");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Client Download");
    expect(html).toContain("v0.0.1");
    expect(html).toContain("a22ec1fa93c5b1d7f37abc7ab18544f39cc4f82246b1494b36cb2c50eeb9f9cb");
    expect(html).toContain("Package Integrity &amp; Signature Verification");
    expect(html).toContain("SHA-256 Checksum");
    expect(html).toContain("apksigner");

    const stripped = html.replace(/<nav class="lang-switcher"[^>]*>[\s\S]*?<\/nav>/, "");
    const hanMatch = stripped.match(/[\u4e00-\u9fa5]/);
    expect(hanMatch).toBeNull();
  });

  test("ja download page renders with Japanese copy and verification instructions", () => {
    const html = readFileSync(resolve(srcDir, "ja/download.html"), "utf-8");
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("クライアントダウンロード");
    expect(html).toContain("v0.0.1");
    expect(html).toContain("a22ec1fa93c5b1d7f37abc7ab18544f39cc4f82246b1494b36cb2c50eeb9f9cb");
    expect(html).toContain("パッケージの真正性と署名検証");
    expect(html).toContain("SHA-256 チェックサムの照合");
    expect(html).toContain("apksigner");
  });
});

describe("multi-locale 404 page rendering", () => {
  beforeAll(() => {
    run404();
  });

  test("zh-CN 404 page renders Chinese heading, subhead, and callout", () => {
    const html = readFileSync(resolve(srcDir, "404.html"), "utf-8");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("页面未找到 (404)");
    expect(html).toContain("线索中断了");
    expect(html).toContain("返回产品首页 →");
  });

  test("en 404 page renders English heading and zero Chinese characters outside switcher", () => {
    const html = readFileSync(resolve(srcDir, "en/404.html"), "utf-8");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Page Not Found (404)");
    expect(html).toContain("Clue interrupted");
    expect(html).toContain("Return to Product Homepage →");

    const stripped = html.replace(/<nav class="lang-switcher"[^>]*>[\s\S]*?<\/nav>/, "");
    const hanMatch = stripped.match(/[\u4e00-\u9fa5]/);
    expect(hanMatch).toBeNull();
  });

  test("ja 404 page renders Japanese heading, subhead, and callout", () => {
    const html = readFileSync(resolve(srcDir, "ja/404.html"), "utf-8");
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain("ページが見つかりません (404)");
    expect(html).toContain("手がかりが途切れました");
    expect(html).toContain("プロダクトトップページに戻る →");
  });
});

describe("built distribution artifacts for all locales", () => {
  beforeAll(() => {
    Bun.spawnSync(["bun", "run", "build"]);
  }, 30000);

  const expectedFiles = [
    "index.html",
    "download.html",
    "404.html",
    "en/index.html",
    "en/download.html",
    "en/404.html",
    "ja/index.html",
    "ja/download.html",
    "ja/404.html",
  ];

  for (const rel of expectedFiles) {
    test(`dist/${rel} exists and is bundled cleanly`, () => {
      const filePath = resolve(distDir, rel);
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf-8");
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain("<html");
      expect(content).toContain("</html>");
    });
  }

  test("dist/en/index.html has zero Chinese characters outside switcher", () => {
    const html = readFileSync(resolve(distDir, "en/index.html"), "utf-8");
    const stripped = html.replace(/<nav class="lang-switcher"[^>]*>[\s\S]*?<\/nav>/, "");
    const hanMatch = stripped.match(/[\u4e00-\u9fa5]/);
    expect(hanMatch).toBeNull();
  });

  test("dist/en/download.html has zero Chinese characters outside switcher", () => {
    const html = readFileSync(resolve(distDir, "en/download.html"), "utf-8");
    const stripped = html.replace(/<nav class="lang-switcher"[^>]*>[\s\S]*?<\/nav>/, "");
    const hanMatch = stripped.match(/[\u4e00-\u9fa5]/);
    expect(hanMatch).toBeNull();
  });

  test("dist/en/404.html has zero Chinese characters outside switcher", () => {
    const html = readFileSync(resolve(distDir, "en/404.html"), "utf-8");
    const stripped = html.replace(/<nav class="lang-switcher"[^>]*>[\s\S]*?<\/nav>/, "");
    const hanMatch = stripped.match(/[\u4e00-\u9fa5]/);
    expect(hanMatch).toBeNull();
  });
});
