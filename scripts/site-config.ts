// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  heading?: string;
  subhead?: string;
  calloutTitle?: string;
  calloutBody?: string;
}

export interface LocaleConfig {
  ogLocale: string;
  siteName: string;
  tagline: string;
  subhead?: string;
  pages: Record<string, PageMeta>;
}

export interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface SiteConfig {
  siteUrl: string;
  defaultLocale: string;
  supportedLocales: string[];
  ogImage: string;
  twitterCard: string;
  locales: Record<string, LocaleConfig>;
  sitemap: {
    entries: SitemapEntry[];
  };
}

const ZH_CN_LOCALE: LocaleConfig = {
  ogLocale: "zh_CN",
  siteName: "谜序 Mixu",
  tagline: "记住每一个线索，推理留给你。",
  subhead: "按阅读进度展开案情板，不剧透，不替你推理。",
  pages: {
    index: {
      path: "/",
      title: "谜序 Mixu — 记住每一个线索，推理留给你。",
      description: "谜序是一款离线优先的悬疑阅读器：按阅读进度展开的案情板，不剧透、不替你推理。",
    },
    download: {
      path: "/download.html",
      title: "客户端下载与校验 — 谜序 Mixu",
      description: "谜序 (Mixu) 官方客户端下载与安装包完整性校验说明。当前处于开发起步阶段，尚未发布公开安装包。",
    },
    notFound: {
      path: "/404.html",
      title: "页面未找到 (404) — 谜序 Mixu",
      description: "您寻找的页面不存在或已移至新地址。",
      heading: "页面未找到 (404)",
      subhead: "您寻找的页面不存在或已移至新地址。",
      calloutTitle: "线索中断了",
      calloutBody: "推理不必停下：您可以返回首页了解谜序的核心理念，或前往客户端下载页面查看安装包发布与签名校验状态。",
    },
  },
};

const DEFAULT_CONFIG: SiteConfig = {
  siteUrl: "https://mixu.app",
  defaultLocale: "zh-CN",
  supportedLocales: ["zh-CN", "en", "ja"],
  ogImage: "/og.png",
  twitterCard: "summary_large_image",
  locales: {
    "zh-CN": ZH_CN_LOCALE,
  },
  sitemap: {
    entries: [
      { path: "/", changefreq: "weekly", priority: 1.0 },
      { path: "/download.html", changefreq: "weekly", priority: 0.8 },
    ],
  },
};

/**
 * Loads the site configuration with fallback to DEFAULT_CONFIG.
 */
export function getSiteConfig(configPath?: string): SiteConfig {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const resolvedPath = configPath ?? resolve(rootDir, "config/site.json");

  if (!existsSync(resolvedPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = readFileSync(resolvedPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SiteConfig>;
    return {
      siteUrl: parsed.siteUrl ?? DEFAULT_CONFIG.siteUrl,
      defaultLocale: parsed.defaultLocale ?? DEFAULT_CONFIG.defaultLocale,
      supportedLocales: parsed.supportedLocales ?? DEFAULT_CONFIG.supportedLocales,
      ogImage: parsed.ogImage ?? DEFAULT_CONFIG.ogImage,
      twitterCard: parsed.twitterCard ?? DEFAULT_CONFIG.twitterCard,
      locales: { ...DEFAULT_CONFIG.locales, ...parsed.locales },
      sitemap: parsed.sitemap ?? DEFAULT_CONFIG.sitemap,
    };
  } catch (err) {
    console.warn(`Warning: failed to parse ${resolvedPath}, falling back to defaults:`, err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Gets locale configuration for given locale, falling back to default locale.
 */
export function getLocaleConfig(locale?: string, config?: SiteConfig): LocaleConfig {
  const cfg = config ?? getSiteConfig();
  const targetLocale = locale ?? cfg.defaultLocale;
  return cfg.locales[targetLocale] ?? cfg.locales[cfg.defaultLocale] ?? ZH_CN_LOCALE;
}

/**
 * Returns canonical absolute URL for a given relative or rooted path.
 */
export function getCanonicalUrl(path: string, config?: SiteConfig): string {
  const cfg = config ?? getSiteConfig();
  const base = cfg.siteUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Generates standard robots.txt content from site configuration.
 */
export function generateRobotsTxt(config?: SiteConfig): string {
  const cfg = config ?? getSiteConfig();
  const sitemapUrl = getCanonicalUrl("/sitemap.xml", cfg);
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

/**
 * Generates standard sitemap.xml content from site configuration.
 */
export function generateSitemapXml(config?: SiteConfig): string {
  const cfg = config ?? getSiteConfig();
  const urls = cfg.sitemap.entries.map((entry) => {
    const loc = getCanonicalUrl(entry.path, cfg);
    const changefreqTag = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : "";
    const priorityTag = typeof entry.priority === "number" ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : "";
    return `  <url>\n    <loc>${loc}</loc>${changefreqTag}${priorityTag}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/**
 * Renders HTML head meta tags for SEO, OpenGraph and Twitter cards.
 */
export function renderMetaTags(
  pageKey: string,
  locale?: string,
  overrides?: Partial<PageMeta>,
  config?: SiteConfig
): string {
  const cfg = config ?? getSiteConfig();
  const locCfg = getLocaleConfig(locale, cfg);
  const page = { ...(locCfg.pages[pageKey] ?? { path: "/", title: locCfg.siteName, description: locCfg.tagline }), ...overrides };

  const canonicalUrl = getCanonicalUrl(page.path, cfg);
  const ogImageUrl = getCanonicalUrl(cfg.ogImage, cfg);

  return `    <link rel="canonical" href="${canonicalUrl}" />

    <!-- OpenGraph -->
    <meta property="og:title" content="${page.title}" />
    <meta
      property="og:description"
      content="${page.description}"
    />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="${locCfg.siteName}" />
    <meta property="og:locale" content="${locCfg.ogLocale}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="${cfg.twitterCard}" />
    <meta name="twitter:title" content="${page.title}" />
    <meta
      name="twitter:description"
      content="${page.description}"
    />
    <meta name="twitter:image" content="${ogImageUrl}" />`;
}
