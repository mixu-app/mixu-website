// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCanonicalUrl,
  getLocaleConfig,
  getSiteConfig,
  renderLangSwitcher,
  type SiteConfig,
} from "./site-config.ts";

/**
 * Processes template HTML into final 404 page HTML, filling in configurable metadata.
 */
export function render404Page(
  templateHtml: string,
  locale: string = "zh-CN",
  config?: SiteConfig
): string {
  const cfg = config ?? getSiteConfig();
  const locCfg = getLocaleConfig(locale, cfg);
  const notFoundPage = locCfg.pages["notFound"];
  const notFoundUi = locCfg.ui?.notFound;
  const langSwitcher = renderLangSwitcher(locale, "notFound", cfg);
  const assetPrefix = locale === "zh-CN" ? "." : "..";

  const quickLinksLabel = locale === "en" ? "Quick Links" : locale === "ja" ? "クイックリンク" : "快捷入口";
  const disclaimers = notFoundUi?.disclaimers ?? [
    "谜序当前处于开发阶段，本站描述的是设计目标，不是已发布功能。",
    "「不剧透」是工程目标：按阅读进度做确定性过滤，并有可失败的回归测试；它不等于数学保证。",
  ];
  const disclaimersHtml = disclaimers.map((d) => `          <li>${d}</li>`).join("\n");

  let rendered = templateHtml
    .replaceAll("{{HTML_LANG}}", locale)
    .replaceAll("{{PAGE_TITLE}}", notFoundPage?.title ?? `${locCfg.siteName} — 404`)
    .replaceAll("{{PAGE_DESCRIPTION}}", notFoundPage?.description ?? locCfg.tagline)
    .replaceAll("{{CANONICAL_URL}}", getCanonicalUrl(notFoundPage?.path ?? "/404.html", cfg))
    .replaceAll("{{OG_SITE_NAME}}", locCfg.siteName)
    .replaceAll("{{OG_LOCALE}}", locCfg.ogLocale)
    .replaceAll("{{ASSET_PREFIX}}", assetPrefix)
    .replaceAll("{{LANG_SWITCHER}}", langSwitcher)
    .replaceAll("{{NAV_HOME_HREF}}", "./index.html")
    .replaceAll("{{NAV_BACK_HOME}}", locCfg.ui?.backHome ?? "← 返回首页")
    .replaceAll("{{MARK_ALT}}", locCfg.siteName)
    .replaceAll("{{QUICK_LINKS_LABEL}}", quickLinksLabel)
    .replaceAll("{{HOME_LINK_HREF}}", "./index.html")
    .replaceAll("{{HOME_LINK_TEXT}}", notFoundUi?.homeLink ?? "返回产品首页 →")
    .replaceAll("{{DOWNLOAD_LINK_HREF}}", "./download.html")
    .replaceAll("{{DOWNLOAD_LINK_TEXT}}", notFoundUi?.downloadLink ?? "客户端下载与校验说明 →")
    .replaceAll("{{GITHUB_LINK_TEXT}}", notFoundUi?.githubLink ?? "GitHub 客户端开源仓库 ↗")
    .replaceAll("{{DISCLAIMERS_HTML}}", disclaimersHtml);

  if (notFoundPage) {
    if (notFoundPage.heading) {
      rendered = rendered.replaceAll("{{NOT_FOUND_HEADING}}", notFoundPage.heading);
    }
    if (notFoundPage.subhead) {
      rendered = rendered.replaceAll("{{NOT_FOUND_SUBHEAD}}", notFoundPage.subhead);
    }
    const calloutTitle = notFoundPage.calloutTitle ?? notFoundUi?.calloutTitle ?? "线索中断了";
    const calloutBody = notFoundPage.calloutBody ?? notFoundUi?.calloutBody ?? "";
    rendered = rendered.replaceAll("{{NOT_FOUND_CALLOUT_TITLE}}", calloutTitle);
    rendered = rendered.replaceAll("{{NOT_FOUND_CALLOUT_BODY}}", calloutBody);
  }

  return rendered.trim() + "\n";
}

export function run(options?: {
  templatePath?: string;
  outputPath?: string;
  locale?: string;
}): void {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const templatePath = options?.templatePath ?? resolve(rootDir, "src/404.template.html");
  const templateHtml = readFileSync(templatePath, "utf-8");
  const cfg = getSiteConfig();

  if (options?.outputPath) {
    const locale = options.locale ?? "zh-CN";
    const renderedHtml = render404Page(templateHtml, locale, cfg);
    const outDir = dirname(options.outputPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(options.outputPath, renderedHtml, "utf-8");
    console.log(`Rendered 404 page [${locale}] to ${options.outputPath}`);
    return;
  }

  // Render for all supported locales
  for (const loc of cfg.supportedLocales) {
    const outputPath = loc === "zh-CN"
      ? resolve(rootDir, "src/404.html")
      : resolve(rootDir, `src/${loc}/404.html`);

    const outDir = dirname(outputPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const renderedHtml = render404Page(templateHtml, loc, cfg);
    writeFileSync(outputPath, renderedHtml, "utf-8");
    console.log(`Rendered 404 page [${loc}] to ${outputPath}`);
  }
}

if (import.meta.main) {
  run();
}
