// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateOgImage, generateOgSvg } from "../scripts/generate-og-image.ts";
import {
  generateRobotsTxt,
  generateSitemapXml,
  getCanonicalUrl,
  getLocaleConfig,
  getSiteConfig,
} from "../scripts/site-config.ts";

const rootDir = resolve(import.meta.dir, "..");
const distDir = resolve(rootDir, "dist");

describe("OG social card deterministic generation", () => {
  test("generates reproducible social card with identical SHA-256 hash across multiple calls", () => {
    const run1 = generateOgImage();
    const run2 = generateOgImage();

    expect(run1.hash).toBe(run2.hash);
    expect(run1.pngBuffer.length).toBe(run2.pngBuffer.length);
    expect(Buffer.compare(run1.pngBuffer, run2.pngBuffer)).toBe(0);

    const manualHash1 = createHash("sha256").update(run1.pngBuffer).digest("hex");
    const manualHash2 = createHash("sha256").update(run2.pngBuffer).digest("hex");
    expect(manualHash1).toBe(manualHash2);
    expect(manualHash1).toBe(run1.hash);
  });

  test("produces PNG with standard dimensions and magic header", () => {
    const result = generateOgImage();
    expect(result.width).toBe(1200);
    expect(result.height).toBe(630);

    // Standard 8-byte PNG signature
    const signature = result.pngBuffer.subarray(0, 8);
    expect(signature).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  test("SVG social card embeds brand mark, palette, typography, and tagline", () => {
    const svg = generateOgSvg();

    // Dimensions
    expect(svg).toContain('viewBox="0 0 1200 630"');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');

    // Brand color palette
    expect(svg).toContain("#f7f6f2"); // paper background
    expect(svg).toContain("#1d1d1f"); // dark ink
    expect(svg).toContain("#6b4f3a"); // warm brown accent
    expect(svg).toContain("#8a7360"); // muted lead

    // Brand mark SVG path or group
    expect(svg).toContain("<path");

    // Brand title and product tagline
    expect(svg).toContain("谜序 Mixu");
    expect(svg).toContain("记住每一个线索，推理留给你。");
  });
});

describe("site configuration & i18n extensibility", () => {
  test("loads configuration with sensible defaults", () => {
    const cfg = getSiteConfig();
    expect(cfg.siteUrl).toBe("https://mixuread.com");
    expect(cfg.defaultLocale).toBe("zh-CN");
    expect(cfg.supportedLocales).toEqual(["zh-CN"]);
  });

  test("provides locale configurations for zh-CN, en and ja", () => {
    const cfg = getSiteConfig();
    const zh = getLocaleConfig("zh-CN", cfg);
    const en = getLocaleConfig("en", cfg);
    const ja = getLocaleConfig("ja", cfg);

    expect(zh.ogLocale).toBe("zh_CN");
    expect(zh.tagline).toBe("记住每一个线索，推理留给你。");

    expect(en.ogLocale).toBe("en_US");
    expect(en.tagline).toContain("Remember every clue");

    expect(ja.ogLocale).toBe("ja_JP");
    expect(ja.tagline).toContain("推理はあなたに");
  });

  test("calculates canonical URLs accurately", () => {
    expect(getCanonicalUrl("/")).toBe("https://mixuread.com/");
    expect(getCanonicalUrl("/download.html")).toBe("https://mixuread.com/download.html");
    expect(getCanonicalUrl("og.png")).toBe("https://mixuread.com/og.png");
  });
});

describe("built distribution artifacts and SEO metadata", () => {
  beforeAll(() => {
    Bun.spawnSync(["bun", "run", "build"]);
  });

  test("robots.txt is emitted with valid crawler directives and sitemap reference", () => {
    const robotsPath = resolve(distDir, "robots.txt");
    expect(existsSync(robotsPath)).toBe(true);

    const content = readFileSync(robotsPath, "utf-8");
    expect(content).toContain("User-agent: *");
    expect(content).toContain("Allow: /");
    expect(content).toContain("Sitemap: https://mixuread.com/sitemap.xml");
  });

  test("sitemap.xml is emitted with canonical URL entries", () => {
    const sitemapPath = resolve(distDir, "sitemap.xml");
    expect(existsSync(sitemapPath)).toBe(true);

    const content = readFileSync(sitemapPath, "utf-8");
    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(content).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(content).toContain("<loc>https://mixuread.com/</loc>");
    expect(content).toContain("<loc>https://mixuread.com/download.html</loc>");
  });

  test("og.png and og.svg are emitted to dist", () => {
    const ogPngPath = resolve(distDir, "og.png");
    const ogSvgPath = resolve(distDir, "og.svg");

    expect(existsSync(ogPngPath)).toBe(true);
    expect(existsSync(ogSvgPath)).toBe(true);

    const buf = readFileSync(ogPngPath);
    expect(buf.length).toBeGreaterThan(1000);
  });

  const pages = [
    { file: "index.html", canonical: "https://mixuread.com/" },
    { file: "download.html", canonical: "https://mixuread.com/download.html" },
    { file: "404.html", canonical: "https://mixuread.com/404.html" },
  ];

  for (const { file, canonical } of pages) {
    test(`dist/${file} contains complete OpenGraph, Twitter and canonical meta tags`, () => {
      const filePath = resolve(distDir, file);
      expect(existsSync(filePath)).toBe(true);

      const html = readFileSync(filePath, "utf-8");

      // Canonical link
      expect(html).toContain(`<link rel="canonical" href="${canonical}"`);

      // OpenGraph tags
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:type" content="website"');
      expect(html).toContain('property="og:image" content="https://mixuread.com/og.png"');
      expect(html).toContain(`property="og:url" content="${canonical}"`);
      expect(html).toContain('property="og:site_name" content="谜序 Mixu"');
      expect(html).toContain('property="og:locale" content="zh_CN"');

      // Twitter Card tags
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain('name="twitter:title"');
      expect(html).toContain('name="twitter:description"');
      expect(html).toContain('name="twitter:image" content="https://mixuread.com/og.png"');
    });
  }

  test("dist/404.html contains honest copy, navigation links, and brand mark", () => {
    const errorHtmlPath = resolve(distDir, "404.html");
    expect(existsSync(errorHtmlPath)).toBe(true);

    const html = readFileSync(errorHtmlPath, "utf-8");
    expect(html).toContain("页面未找到");
    expect(html).toContain("您寻找的页面不存在或已移至新地址");
    expect(html).toContain("返回首页");
    expect(html).toContain("客户端下载与校验说明");
    expect(html).toContain("logo-mark");
    expect(html).toContain("「不剧透」是工程目标");
  });
});
