// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseHeroMarkdown, renderAllHeroPages, renderHeroHtml } from "../scripts/render-hero.ts";
import { run as runDownload } from "../scripts/render-download.ts";
import { run as run404 } from "../scripts/render-404.ts";
import { getLocaleConfig, getSiteConfig, renderLangSwitcher, type SiteConfig } from "../scripts/site-config.ts";

const rootDir = resolve(import.meta.dir, "..");
const srcDir = resolve(rootDir, "src");
const distDir = resolve(rootDir, "dist");

describe("i18n configuration and extensible dictionary", () => {
  const cfg = getSiteConfig();

  test("defaults to zh-CN only in active production configuration", () => {
    expect(cfg.supportedLocales).toEqual(["zh-CN"]);
    expect(cfg.defaultLocale).toBe("zh-CN");
  });

  test("omits language switcher when only zh-CN is active", () => {
    expect(renderLangSwitcher("zh-CN", "index", cfg)).toBe("");
    expect(renderLangSwitcher("zh-CN", "download", cfg)).toBe("");
    expect(renderLangSwitcher("zh-CN", "notFound", cfg)).toBe("");
  });

  test("provides complete UI dictionaries for zh-CN, en, and ja extensibility", () => {
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

  test("renders accessible language switcher when multi-locale config is enabled", () => {
    const multiCfg: SiteConfig = {
      ...cfg,
      supportedLocales: ["zh-CN", "en", "ja"],
    };
    const switcherZh = renderLangSwitcher("zh-CN", "index", multiCfg);
    expect(switcherZh).toContain('<nav class="lang-switcher" aria-label="Language">');
    expect(switcherZh).toContain('href="/" class="active" aria-current="page"');
    expect(switcherZh).toContain('href="/en/"');
    expect(switcherZh).toContain('href="/ja/"');
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

describe("zh-CN hero, download, and 404 page rendering", () => {
  beforeAll(() => {
    renderAllHeroPages();
    runDownload();
    run404();
  });

  test("zh-CN hero page renders with Chinese headings, icon-only navbar actions, and no lang switcher", () => {
    const html = readFileSync(resolve(srcDir, "index.html"), "utf-8");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("记住每一个线索，推理留给你。");
    expect(html).toContain("<h2>三条价值</h2>");
    expect(html).toContain("<h2>适合谁</h2>");
    expect(html).toContain("<h2>不适合谁（诚实说明）</h2>");
    expect(html).toContain('alt="谜序 Mixu"');
    expect(html).toContain('href="https://github.com/mixu-app/mixu"');
    expect(html).not.toContain('<nav class="lang-switcher"');
    expect(html).toContain('<link rel="canonical" href="https://mixuread.com/" />');
    expect(html).toContain('property="og:locale" content="zh_CN"');
  });

  test("renderHeroHtml in en mode contains zero Chinese characters", () => {
    const rawEn = readFileSync(resolve(rootDir, "content/hero.en.md"), "utf-8");
    const data = parseHeroMarkdown(rawEn);
    const html = renderHeroHtml(data, "en");
    const hanMatch = html.match(/[\u4e00-\u9fa5]/);
    expect(hanMatch).toBeNull();
  });

  test("zh-CN download page renders honestly with Chinese copy and verification guide", () => {
    const html = readFileSync(resolve(srcDir, "download.html"), "utf-8");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("客户端下载");
    expect(html).toContain("v0.0.1");
    expect(html).toContain("c1c16f18f941d6f672cfa606e526f092686c8ea8687f0f71f9acadf93432c31c");
    expect(html).toContain("安装包真实性与签名校验");
    expect(html).toContain("SHA-256 校验和");
    expect(html).toContain("apksigner");
    expect(html).not.toContain('<nav class="lang-switcher"');
  });

  test("zh-CN 404 page renders Chinese heading, subhead, and callout", () => {
    const html = readFileSync(resolve(srcDir, "404.html"), "utf-8");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("页面未找到 (404)");
    expect(html).toContain("线索中断了");
    expect(html).toContain("返回产品首页 →");
    expect(html).not.toContain('<nav class="lang-switcher"');
  });
});

describe("built distribution artifacts for zh-CN", () => {
  beforeAll(() => {
    Bun.spawnSync(["bun", "run", "build"]);
  }, 30000);

  const expectedFiles = ["index.html", "download.html", "404.html"];

  for (const rel of expectedFiles) {
    test(`dist/${rel} exists and is bundled cleanly`, () => {
      const filePath = resolve(distDir, rel);
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf-8");
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain('<html lang="zh-CN">');
      expect(content).toContain("</html>");
      expect(content).not.toContain('<nav class="lang-switcher"');
    });
  }
});
