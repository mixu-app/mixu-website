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

export interface HeroUiConfig {
  valuesHeading?: string;
  audienceHeading?: string;
  limitationsHeading?: string;
  disclaimersHeading?: string;
}

export interface DownloadUiConfig {
  heading?: string;
  intro?: string;
  statusHeading?: string;
  statusNoticeStrong?: string;
  statusNoticeBody?: string;
  repoNoticePrefix?: string;
  availableHeading?: string;
  releaseDateLabel?: string;
  minSdkLabel?: string;
  downloadApkButton?: string;
  checksumLabel?: string;
  changelogHeading?: string;
  verificationHeading?: string;
  verificationIntro?: string;
  step1Heading?: string;
  step1Body?: string;
  step2Heading?: string;
  step2Body1?: string;
  step2Body2?: string;
  step3Heading?: string;
  step3Body?: string;
  disclaimer?: string;
}

export interface NotFoundUiConfig {
  calloutTitle?: string;
  calloutBody?: string;
  homeLink?: string;
  downloadLink?: string;
  githubLink?: string;
  disclaimers?: string[];
}

export interface LocaleUiConfig {
  langLabel?: string;
  navHome?: string;
  backHome?: string;
  downloadPageLink?: string;
  hero?: HeroUiConfig;
  download?: DownloadUiConfig;
  notFound?: NotFoundUiConfig;
}

export interface LocaleConfig {
  ogLocale: string;
  siteName: string;
  tagline: string;
  subhead?: string;
  ui?: LocaleUiConfig;
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
  ui: {
    langLabel: "Language",
    navHome: "首页",
    backHome: "← 返回首页",
    downloadPageLink: "客户端下载与签名校验说明 →",
    hero: {
      valuesHeading: "三条价值",
      audienceHeading: "适合谁",
      limitationsHeading: "不适合谁（诚实说明）",
      disclaimersHeading: "页脚声明（必须保留）",
    },
    download: {
      heading: "客户端下载",
      intro: "谜序是一款离线优先的悬疑阅读器。这里提供官方 Android 客户端安装包 (APK) 下载以及发布签名、校验和验证说明。",
      statusHeading: "发布状态",
      statusNoticeStrong: "当前处于文档与开发起步阶段，尚未发布公开安装包 (APK)。",
      statusNoticeBody: "谜序遵循「文档先行、规约驱动」的原则。待 M0 阅读器基础与 M1 案情板里程碑就绪后，我们将在本页发布首个公开 Alpha 预览版本。",
      repoNoticePrefix: "欢迎关注开源客户端仓库的最新进展：",
      availableHeading: "可用版本",
      releaseDateLabel: "发布日期：",
      minSdkLabel: "最低系统要求：Android API ",
      downloadApkButton: "下载 APK",
      checksumLabel: "SHA-256 校验和：",
      changelogHeading: "更新日志",
      verificationHeading: "安装包真实性与签名校验",
      verificationIntro: "为确保您的设备安全，避免运行恶意篡改版本，在安装从网络下载的 APK 前，请务必进行 SHA-256 校验和核对与官方数字签名验证。",
      step1Heading: "1. SHA-256 校验和比对",
      step1Body: "在本地终端运行系统工具计算下载文件的 SHA-256 哈希，核对是否与官方清单中给出的校验值完全一致：",
      step2Heading: "2. 官方数字签名验证 (APK Signature Scheme)",
      step2Body1: "谜序官方构建使用发布证书进行 APK Signature Scheme (v2/v3) 签名。您可使用 Android SDK 提供的 <code>apksigner</code> 工具验证签名真实性：",
      step2Body2: "验证结果中必须包含 <code>Verified using v2 scheme (APK Signature Scheme v2): true</code>（或 v3 为 <code>true</code>），且证书指纹与官方公布的指纹一致。",
      step3Heading: "3. 官方发布渠道与源码构建",
      step3Body: "官方安装包仅通过本站及 GitHub 官方 Releases 页面发布：<a href=\"https://github.com/mixu-app/mixu-client\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/mixu-app/mixu-client</a>。请勿在任何未经验证的第三方应用市场或网盘下载安装包。您也可以直接获取客户端开源代码，在本地使用 Android Studio / Gradle 进行构建。",
      disclaimer: "「不剧透」是工程目标：按阅读进度做确定性过滤，并有可失败的回归测试；它不等于数学保证。",
    },
    notFound: {
      calloutTitle: "线索中断了",
      calloutBody: "推理不必停下：您可以返回首页了解谜序的核心理念，或前往客户端下载页面查看安装包发布与签名校验状态。",
      homeLink: "返回产品首页 →",
      downloadLink: "客户端下载与校验说明 →",
      githubLink: "GitHub 客户端开源仓库 ↗",
      disclaimers: [
        "谜序当前处于开发阶段，本站描述的是设计目标，不是已发布功能。",
        "「不剧透」是工程目标：按阅读进度做确定性过滤，并有可失败的回归测试；它不等于数学保证。",
      ],
    },
  },
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

const EN_LOCALE: LocaleConfig = {
  ogLocale: "en_US",
  siteName: "Mixu",
  tagline: "Remember every clue. The deduction is yours.",
  subhead: "A spoiler-free mystery reader that unfolds a case board as you read.",
  ui: {
    langLabel: "Language",
    navHome: "Home",
    backHome: "← Back to Home",
    downloadPageLink: "Client Download & Verification Guide →",
    hero: {
      valuesHeading: "Core Values",
      audienceHeading: "Who It Is For",
      limitationsHeading: "Who It Is Not For (Honest Limitations)",
      disclaimersHeading: "Footer Disclaimers",
    },
    download: {
      heading: "Client Download",
      intro: "Mixu is an offline-first mystery reader. Official Android client package (APK) downloads, release signatures, and integrity verification instructions are provided here.",
      statusHeading: "Release Status",
      statusNoticeStrong: "Currently in the documentation and early development phase; no public packages (APK) have been released yet.",
      statusNoticeBody: "Mixu follows a \"documentation-first, specification-driven\" approach. The first public Alpha preview release will be published here once milestones M0 (Reader Foundation) and M1 (Case Board) are complete.",
      repoNoticePrefix: "Follow development progress on our open-source client repository: ",
      availableHeading: "Available Releases",
      releaseDateLabel: "Release Date: ",
      minSdkLabel: "Minimum System Requirements: Android API ",
      downloadApkButton: "Download APK",
      checksumLabel: "SHA-256 Checksum: ",
      changelogHeading: "Changelog",
      verificationHeading: "Package Integrity & Signature Verification",
      verificationIntro: "To safeguard your device and avoid tampered builds, verify the SHA-256 checksum and official digital signature before installing any downloaded APK.",
      step1Heading: "1. SHA-256 Checksum Comparison",
      step1Body: "Compute the SHA-256 hash using local terminal tools and verify it matches the official manifest exactly:",
      step2Heading: "2. Official Digital Signature Verification (APK Signature Scheme)",
      step2Body1: "Official Mixu builds are signed with release certificates using APK Signature Scheme (v2/v3). Use <code>apksigner</code> from the Android SDK to verify authenticity:",
      step2Body2: "The output must contain <code>Verified using v2 scheme (APK Signature Scheme v2): true</code> (or v3 is <code>true</code>), and the certificate fingerprint must match the officially published fingerprint.",
      step3Heading: "3. Official Release Channels & Source Builds",
      step3Body: "Official packages are distributed solely via this site and the official GitHub Releases page: <a href=\"https://github.com/mixu-app/mixu-client\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/mixu-app/mixu-client</a>. Do not download from unverified third-party app stores. You may also clone the open-source client code and build locally with Android Studio / Gradle.",
      disclaimer: "\"Spoiler-free\" is an engineering objective: deterministic filtering based on reading progress backed by failing regression tests; it is not a mathematical guarantee.",
    },
    notFound: {
      calloutTitle: "Clue interrupted",
      calloutBody: "The deduction does not have to stop: return to the homepage to explore Mixu's core principles, or visit the client download page for release and signature verification status.",
      homeLink: "Return to Product Homepage →",
      downloadLink: "Client Download & Verification Guide →",
      githubLink: "GitHub Client Repository ↗",
      disclaimers: [
        "Mixu is currently in development. This site describes design goals, not released features.",
        "\"Spoiler-free\" is an engineering objective: deterministic filtering based on reading progress backed by failing regression tests; it is not a mathematical guarantee.",
      ],
    },
  },
  pages: {
    index: {
      path: "/en/",
      title: "Mixu — Remember every clue. The deduction is yours.",
      description: "Mixu is an offline-first mystery reader: an interactive case board that unfolds as you read, spoiler-free.",
    },
    download: {
      path: "/en/download.html",
      title: "Download & Verification — Mixu",
      description: "Official Mixu client download and package integrity verification guide.",
    },
    notFound: {
      path: "/en/404.html",
      title: "Page Not Found (404) — Mixu",
      description: "The page you are looking for does not exist or has been moved.",
      heading: "Page Not Found (404)",
      subhead: "The page you are looking for does not exist or has been moved.",
      calloutTitle: "Clue interrupted",
      calloutBody: "The deduction does not have to stop: return to the homepage or check the client download verification guide.",
    },
  },
};

const JA_LOCALE: LocaleConfig = {
  ogLocale: "ja_JP",
  siteName: "Mixu (ミクス)",
  tagline: "すべての手がかりを記録し、推理はあなたに。",
  subhead: "読書進度に合わせて広がるネタバレなしの捜査ボード。",
  ui: {
    langLabel: "Language",
    navHome: "ホーム",
    backHome: "← ホームに戻る",
    downloadPageLink: "クライアントのダウンロードと検証手順 →",
    hero: {
      valuesHeading: "3つの価値",
      audienceHeading: "対象読者",
      limitationsHeading: "対象外の方（誠実な説明）",
      disclaimersHeading: "免責事項",
    },
    download: {
      heading: "クライアントダウンロード",
      intro: "Mixuはオフライン優先のミステリー読書アプリです。ここでは公式Androidクライアント（APK）のダウンロードと、リリース署名およびチェックサムの検証手順を提供しています。",
      statusHeading: "リリース状況",
      statusNoticeStrong: "現在はドキュメント先行・開発初期段階のため、公開パッケージ（APK）はまだリリースされていません。",
      statusNoticeBody: "Mixuは「ドキュメント先行・仕様駆動」の原則に従っています。M0（リーダー基盤）およびM1（捜査ボード）のマイルストーン完了後、本ページにて最初の公開Alphaプレビュー版をリリース予定です。",
      repoNoticePrefix: "オープンソースクライアントリポジトリの最新の進捗をご確認ください：",
      availableHeading: "利用可能なバージョン",
      releaseDateLabel: "リリース日：",
      minSdkLabel: "最低システム要件：Android API ",
      downloadApkButton: "APKをダウンロード",
      checksumLabel: "SHA-256 チェックサム：",
      changelogHeading: "更新履歴",
      verificationHeading: "パッケージの真正性と署名検証",
      verificationIntro: "端末の安全性を確保し、改ざんされたビルドの実行を防ぐため、ダウンロードしたAPKをインストールする前に必ずSHA-256チェックサムと公式デジタル署名の検証を行ってください。",
      step1Heading: "1. SHA-256 チェックサムの照合",
      step1Body: "ターミナルでダウンロードファイルのSHA-256ハッシュを計算し、公式マニフェストの値と完全に一致することを確認してください：",
      step2Heading: "2. 公式デジタル署名検証 (APK Signature Scheme)",
      step2Body1: "Mixuの公式ビルドはリリース証明書を用いてAPK Signature Scheme（v2/v3）で署名されています。Android SDKの<code>apksigner</code>ツールを使用して真正性を検証できます：",
      step2Body2: "検証結果に<code>Verified using v2 scheme (APK Signature Scheme v2): true</code>（またはv3が<code>true</code>）が含まれ、証明書のフィンガープリントが公式発表のものと一致する必要があります。",
      step3Heading: "3. 公式リリースチャネルとソースコードビルド",
      step3Body: "公式パッケージは当サイトおよび公式GitHub Releasesページ（<a href=\"https://github.com/mixu-app/mixu-client\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/mixu-app/mixu-client</a>）でのみ配布されます。未検証のサードパーティサイトからダウンロードしないでください。クライアントのソースコードを取得し、Android Studio / Gradleでローカルビルドすることも可能です。",
      disclaimer: "「ネタバレなし」は工学的な目標です：読書進度に基づく決定論的フィルタリングと回帰テストによって担保されており、数学的な絶対保証ではありません。",
    },
    notFound: {
      calloutTitle: "手がかりが途切れました",
      calloutBody: "推理を止める必要はありません：トップページに戻ってMixuの設計思想を確認するか、クライアントダウンロードページでパッケージの公開と署名検証状況をご確認ください。",
      homeLink: "プロダクトトップページに戻る →",
      downloadLink: "クライアントのダウンロードと検証手順 →",
      githubLink: "GitHub クライアントリポジトリ ↗",
      disclaimers: [
        "Mixuは現在開発段階にあり、当サイトで説明している内容は設計目標であり、リリース済み機能ではありません。",
        "「ネタバレなし」は工学的な目標です：読書進度に基づく決定論的フィルタリングと回帰テストによって担保されており、数学的な絶対保証ではありません。",
      ],
    },
  },
  pages: {
    index: {
      path: "/ja/",
      title: "Mixu — すべての手がかりを記録し、推理はあなたに。",
      description: "Mixuはオフライン優先のミステリー読書アプリです：読書進度に合わせて展開するネタバレなしの捜査ボード。",
    },
    download: {
      path: "/ja/download.html",
      title: "ダウンロードと検証 — Mixu",
      description: "Mixu 公式クライアントのダウンロードとパッケージ整合性検証の手引き。",
    },
    notFound: {
      path: "/ja/404.html",
      title: "ページが見つかりません (404) — Mixu",
      description: "お探しのページは存在しないか、移動した可能性があります。",
      heading: "ページが見つかりません (404)",
      subhead: "お探しのページは存在しないか、移動した可能性があります。",
      calloutTitle: "手がかりが途切れました",
      calloutBody: "推理を止める必要はありません：トップページに戻るか、ダウンロード検証ページをご確認ください。",
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
    en: EN_LOCALE,
    ja: JA_LOCALE,
  },
  sitemap: {
    entries: [
      { path: "/", changefreq: "weekly", priority: 1.0 },
      { path: "/download.html", changefreq: "weekly", priority: 0.8 },
      { path: "/en/", changefreq: "weekly", priority: 0.9 },
      { path: "/en/download.html", changefreq: "weekly", priority: 0.7 },
      { path: "/ja/", changefreq: "weekly", priority: 0.9 },
      { path: "/ja/download.html", changefreq: "weekly", priority: 0.7 },
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
      locales: {
        "zh-CN": { ...ZH_CN_LOCALE, ...(parsed.locales?.["zh-CN"] ?? {}) },
        en: { ...EN_LOCALE, ...(parsed.locales?.["en"] ?? {}) },
        ja: { ...JA_LOCALE, ...(parsed.locales?.["ja"] ?? {}) },
        ...parsed.locales,
      },
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
 * Renders an accessible language switcher component with links between supported locales.
 */
export function renderLangSwitcher(
  currentLocale: string,
  pageType: "index" | "download" | "notFound" = "index",
  config?: SiteConfig
): string {
  const cfg = config ?? getSiteConfig();
  const currentLocCfg = getLocaleConfig(currentLocale, cfg);
  const langAriaLabel = currentLocCfg.ui?.langLabel ?? "Language";

  const localeLabels: Record<string, string> = {
    "zh-CN": "中文",
    en: "English",
    ja: "日本語",
  };

  const getPath = (loc: string): string => {
    const locCfg = getLocaleConfig(loc, cfg);
    if (pageType === "index") {
      return loc === "zh-CN" ? "/" : `/${loc}/`;
    }
    const pageKey = pageType === "download" ? "download" : "notFound";
    return locCfg.pages[pageKey]?.path ?? (loc === "zh-CN" ? `/${pageKey}.html` : `/${loc}/${pageKey}.html`);
  };

  const items = cfg.supportedLocales.map((loc) => {
    const href = getPath(loc);
    const label = localeLabels[loc] ?? loc;
    const isActive = loc === currentLocale;
    const attr = isActive ? ' class="active" aria-current="page"' : "";
    return `<a href="${href}"${attr}>${label}</a>`;
  });

  return `<nav class="lang-switcher" aria-label="${langAriaLabel}">
        ${items.join("\n        ")}
      </nav>`;
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
