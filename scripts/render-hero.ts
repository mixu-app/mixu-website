// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  getCanonicalUrl,
  getLocaleConfig,
  getSiteConfig,
  renderLangSwitcher,
  type SiteConfig,
} from "./site-config.ts";

export interface HeroCta {
  type: string;
  isPrimary: boolean;
  label: string;
  hint: string;
  href: string;
}

export interface HeroData {
  headline: string;
  subheadHtml: string;
  subheadRaw: string;
  valuesHtml: string;
  valuesRaw: string;
  audienceHtml: string;
  audienceRaw: string;
  limitationsHtml: string;
  limitationsRaw: string;
  ctas: HeroCta[];
  ctasRaw: string;
  disclaimersHtml: string;
  disclaimersRaw: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Parses markdown source into structured hero content, supporting zh-CN, en, and ja section conventions.
 */
export function parseHeroMarkdown(source: string): HeroData {
  if (!source || !source.trim()) {
    throw new Error("Hero markdown source is empty");
  }

  const sections = new Map<string, string>();
  const blocks = source.split(/^##\s+/m);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block) continue;
    const newline = block.indexOf("\n");
    const title = newline === -1 ? block.trim() : block.slice(0, newline).trim();
    const body = newline === -1 ? "" : block.slice(newline + 1).trim();
    sections.set(title, body);
  }

  function getSection(predicate: (title: string) => boolean, sectionName: string): { title: string; body: string } {
    for (const [title, body] of sections.entries()) {
      if (predicate(title)) {
        return { title, body };
      }
    }
    throw new Error(`Missing required section: ${sectionName}`);
  }

  // 1. Headline (zh-CN: 主标题 / ja: 主見出し, 主タイトル / en: Headline, Main Headline)
  const headlineSec = getSection(
    (t) => /(主标题|主見出し|主タイトル|メイン見出し|headline)/i.test(t),
    "## 主标题 / Headline"
  );
  const firstLine = headlineSec.body.split("\n")[0]?.trim() ?? "";
  const headline = firstLine.replace(/^\*\*|\*\*$/g, "").trim();
  if (!headline) {
    throw new Error("Headline copy in hero markdown cannot be empty");
  }

  // 2. Subhead (zh-CN: 副标题 / ja: 副見出し, 副タイトル / en: Subhead, Subtitle)
  const subheadSec = getSection(
    (t) => /(副标题|副見出し|副タイトル|サブ|subhead|subtitle)/i.test(t),
    "## 副标题 / Subhead"
  );
  const subheadHtml = Bun.markdown
    .html(subheadSec.body)
    .replaceAll("&quot;", '"')
    .trim()
    .replace(/^<p>/, '<p class="subhead">');

  // 3. Values (zh-CN: 价值 / ja: 価値 / en: Value, Values)
  const valuesSec = getSection(
    (t) => /(价值|価値|value|feature)/i.test(t),
    "## 三条价值 / Core Values"
  );
  const valuesHtml = Bun.markdown.html(valuesSec.body).replaceAll("&quot;", '"').trim();

  // 4. Audience (zh-CN: 适合谁 / ja: 対象読者 / en: Who It Is For, Audience)
  const audienceSec = getSection(
    (t) => /(适合谁|対象読者|おすすめ|who it is for|audience)/i.test(t) && !/(不适合|不適合|対象外|not)/i.test(t),
    "## 适合谁 / Who It Is For"
  );
  const audienceHtml = Bun.markdown.html(audienceSec.body).replaceAll("&quot;", '"').trim();

  // 5. Limitations (zh-CN: 不适合 / ja: 対象外, 不適合 / en: Who It Is Not For, Limitations)
  const limitationsSec = getSection(
    (t) => /(不适合|不適合|対象外|not for|limitation)/i.test(t),
    "## 不适合谁 / Who It Is Not For"
  );
  const limitationsHtml = Bun.markdown.html(limitationsSec.body).replaceAll("&quot;", '"').trim();

  // 6. CTAs (zh-CN: 按钮, CTA / ja: ボタン, アクション / en: Buttons, CTA)
  const ctaSec = getSection(
    (t) => /(按钮|ボタン|cta|button|action)/i.test(t),
    "## 主按钮 / CTA Buttons"
  );
  const ctas: HeroCta[] = [];
  for (const line of ctaSec.body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("-")) continue;
    const match = trimmed.match(/^-\s*(主|次|Primary|Secondary|Main|Sub|メイン|サブ)[：:]\s*\*\*(.+?)\*\*\s*(.+)?$/i);
    if (match && match[1] && match[2]) {
      const typeStr = match[1].toLowerCase();
      const isPrimary = ["主", "primary", "main", "メイン"].includes(typeStr);
      const label = match[2].trim();
      const hint = (match[3] ?? "").trim();
      ctas.push({
        type: match[1],
        isPrimary,
        label,
        hint,
        href: isPrimary ? "#demo" : "https://github.com/mixu-app/mixu-client",
      });
    }
  }

  if (ctas.length === 0) {
    throw new Error("Missing CTA buttons in CTA section");
  }

  // 7. Disclaimers (zh-CN: 声明, 页脚 / ja: 免責, フッター / en: Disclaimers, Footer)
  const disclaimersSec = getSection(
    (t) => /(声明|免責|页脚|フッター|disclaimer|footer|notice)/i.test(t),
    "## 页脚声明 / Footer Disclaimers"
  );
  const disclaimersHtml = Bun.markdown.html(disclaimersSec.body).replaceAll("&quot;", '"').trim();

  return {
    headline,
    subheadHtml,
    subheadRaw: subheadSec.body,
    valuesHtml,
    valuesRaw: valuesSec.body,
    audienceHtml,
    audienceRaw: audienceSec.body,
    limitationsHtml,
    limitationsRaw: limitationsSec.body,
    ctas,
    ctasRaw: ctaSec.body,
    disclaimersHtml,
    disclaimersRaw: disclaimersSec.body,
  };
}

/**
 * Formats the parsed hero data into semantic HTML elements, localized according to configuration.
 */
export function renderHeroHtml(data: HeroData, locale: string = "zh-CN", config?: SiteConfig): string {
  const cfg = config ?? getSiteConfig();
  const locCfg = getLocaleConfig(locale, cfg);
  const langSwitcher = renderLangSwitcher(locale, "index", cfg);
  const assetPrefix = locale === "zh-CN" ? "." : "..";

  const heroUi = locCfg.ui?.hero;
  const valuesHeading = heroUi?.valuesHeading ?? (locale === "en" ? "Core Values" : locale === "ja" ? "3つの価値" : "三条价值");
  const audienceHeading = heroUi?.audienceHeading ?? (locale === "en" ? "Who It Is For" : locale === "ja" ? "対象読者" : "适合谁");
  const limitationsHeading = heroUi?.limitationsHeading ?? (locale === "en" ? "Who It Is Not For (Honest Limitations)" : locale === "ja" ? "対象外の方（誠実な説明）" : "不适合谁（诚实说明）");

  const ctasHtml = data.ctas
    .map((cta) => {
      const cls = cta.isPrimary ? "cta cta-primary" : "cta cta-secondary";
      const target = cta.href.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
      const hintHtml = cta.hint ? ` <span class="cta-hint">${cta.hint}</span>` : "";
      return `<a class="${cls}" href="${cta.href}"${target}><span class="cta-label">${cta.label}</span>${hintHtml}</a>`;
    })
    .join("\n        ");

  return `
      ${langSwitcher}
      <header class="hero-header">
        <img class="mark" src="${assetPrefix}/logo-mark.svg" alt="${escapeHtml(locCfg.siteName)}" width="56" height="56" />
        <h1>${data.headline}</h1>
        ${data.subheadHtml}
        <div class="cta-group">
          ${ctasHtml}
        </div>
      </header>

      <section id="demo" class="section values">
        <h2>${valuesHeading}</h2>
        ${data.valuesHtml}
      </section>

      <section class="section audience">
        <h2>${audienceHeading}</h2>
        ${data.audienceHtml}
      </section>

      <section class="section limitations">
        <h2>${limitationsHeading}</h2>
        ${data.limitationsHtml}
      </section>

      <footer class="footer-disclaimers note">
        ${data.disclaimersHtml}
      </footer>`.trim();
}

/**
 * Reads content and template, performs rendering, and writes to output target.
 */
export function renderHero(
  contentPath?: string,
  templatePath?: string,
  outputPath?: string,
  locale?: string,
  config?: SiteConfig
): { data: HeroData; html: string; outputPath: string } {
  const currentLocale = locale ?? "zh-CN";
  const cfg = config ?? getSiteConfig();
  const locCfg = getLocaleConfig(currentLocale, cfg);

  const defaultContentFilename = currentLocale === "zh-CN" ? "hero.zh-CN.md" : `hero.${currentLocale}.md`;
  const resolvedContent = contentPath ?? resolve(import.meta.dir, `../content/${defaultContentFilename}`);
  const resolvedTemplate = templatePath ?? resolve(import.meta.dir, "../src/index.template.html");
  const defaultOutputRel = currentLocale === "zh-CN" ? "src/index.html" : `src/${currentLocale}/index.html`;
  const resolvedOutput = outputPath ?? resolve(import.meta.dir, `../${defaultOutputRel}`);

  if (!existsSync(resolvedContent)) {
    throw new Error(`Missing content file: ${resolvedContent}`);
  }
  if (!existsSync(resolvedTemplate)) {
    throw new Error(`Missing template file: ${resolvedTemplate}`);
  }

  const rawMarkdown = readFileSync(resolvedContent, "utf-8");
  const data = parseHeroMarkdown(rawMarkdown);
  const heroHtml = renderHeroHtml(data, currentLocale, cfg);

  const assetPrefix = currentLocale === "zh-CN" ? "." : "..";
  const navAriaLabel = currentLocale === "en" ? "Navigation" : currentLocale === "ja" ? "ナビゲーション" : "页面导航";
  const downloadLinkText = locCfg.ui?.downloadPageLink ?? "客户端下载与签名校验说明 →";

  const rawTemplate = readFileSync(resolvedTemplate, "utf-8");
  const fullHtml = rawTemplate
    .replaceAll("{{HTML_LANG}}", currentLocale)
    .replaceAll("{{PAGE_TITLE}}", `${locCfg.siteName} — ${data.headline}`)
    .replaceAll("{{PAGE_DESCRIPTION}}", locCfg.pages.index?.description ?? locCfg.tagline)
    .replaceAll("{{CANONICAL_URL}}", getCanonicalUrl(locCfg.pages.index?.path ?? "/", cfg))
    .replaceAll("{{OG_SITE_NAME}}", locCfg.siteName)
    .replaceAll("{{OG_LOCALE}}", locCfg.ogLocale)
    .replaceAll("{{ASSET_PREFIX}}", assetPrefix)
    .replaceAll("{{NAV_ARIA_LABEL}}", navAriaLabel)
    .replaceAll("{{DOWNLOAD_LINK_HREF}}", "./download.html")
    .replaceAll("{{DOWNLOAD_LINK_TEXT}}", downloadLinkText)
    .replaceAll("{{HERO_HEADLINE}}", data.headline)
    .replace("<!-- HERO_CONTENT -->", heroHtml)
    .replace("{{HERO_CONTENT}}", heroHtml);

  const outDir = dirname(resolvedOutput);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(resolvedOutput, fullHtml, "utf-8");

  return {
    data,
    html: fullHtml,
    outputPath: resolvedOutput,
  };
}

/**
 * Renders hero pages for all configured supported locales.
 */
export function renderAllHeroPages(config?: SiteConfig): Array<{ locale: string; outputPath: string }> {
  const cfg = config ?? getSiteConfig();
  const rootDir = resolve(import.meta.dir, "..");
  const results: Array<{ locale: string; outputPath: string }> = [];

  for (const loc of cfg.supportedLocales) {
    const contentFilename = loc === "zh-CN" ? "hero.zh-CN.md" : `hero.${loc}.md`;
    const contentPath = resolve(rootDir, `content/${contentFilename}`);
    const outputPath = loc === "zh-CN" ? resolve(rootDir, "src/index.html") : resolve(rootDir, `src/${loc}/index.html`);

    const res = renderHero(contentPath, undefined, outputPath, loc, cfg);
    results.push({ locale: loc, outputPath: res.outputPath });
  }

  return results;
}

if (import.meta.main) {
  try {
    const rendered = renderAllHeroPages();
    for (const item of rendered) {
      console.log(`Rendered hero content successfully [${item.locale}] into: ${item.outputPath}`);
    }
  } catch (err) {
    console.error(`Build Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
