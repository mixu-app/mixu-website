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

export interface Release {
  version: string;
  build_number: number;
  channel: "alpha" | "beta" | "stable" | string;
  release_date: string;
  download_url: string;
  sha256: string;
  min_sdk: number;
  changelog_zh: string[];
  changelog_en?: string[];
  changelog_ja?: string[];
}

export interface DownloadManifest {
  $schema?: string;
  schema_version: number;
  releases: Release[];
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderReleasesSection(
  releases: Release[],
  locale: string = "zh-CN",
  config?: SiteConfig
): string {
  const cfg = config ?? getSiteConfig();
  const locCfg = getLocaleConfig(locale, cfg);
  const ui = locCfg.ui?.download;

  if (!releases || releases.length === 0) {
    const statusHeading = ui?.statusHeading ?? "发布状态";
    const statusNoticeStrong = ui?.statusNoticeStrong ?? "当前处于文档与开发起步阶段，尚未发布公开安装包 (APK)。";
    const statusNoticeBody = ui?.statusNoticeBody ?? "谜序遵循「文档先行、规约驱动」的原则。待 M0 阅读器基础与 M1 案情板里程碑就绪后，我们将在本页发布首个公开 Alpha 预览版本。";
    const repoNoticePrefix = ui?.repoNoticePrefix ?? "欢迎关注开源客户端仓库的最新进展：";

    const period = locale === "en" ? "." : "。";
    return `      <section class="callout phase-notice">
        <h2>${escapeHtml(statusHeading)}</h2>
        <p>
          <strong>${escapeHtml(statusNoticeStrong)}</strong>
        </p>
        <p>
          ${escapeHtml(statusNoticeBody)}
        </p>
        <p>
          ${escapeHtml(repoNoticePrefix)}<a href="https://github.com/mixu-app/mixu-client" target="_blank" rel="noopener noreferrer">github.com/mixu-app/mixu-client</a>${period}
        </p>
      </section>`;
  }

  const availableHeading = ui?.availableHeading ?? "可用版本";
  const releaseDateLabel = ui?.releaseDateLabel ?? "发布日期：";
  const minSdkLabel = ui?.minSdkLabel ?? "最低系统要求：Android API ";
  const downloadButtonText = ui?.downloadApkButton ?? "下载 APK";
  const checksumLabel = ui?.checksumLabel ?? "SHA-256 校验和：";
  const changelogHeading = ui?.changelogHeading ?? "更新日志";

  const items = releases
    .map((rel) => {
      const notes =
        locale === "en"
          ? (rel.changelog_en ?? rel.changelog_zh)
          : locale === "ja"
            ? (rel.changelog_ja ?? rel.changelog_zh)
            : rel.changelog_zh;
      const changelogItems = notes
        .map((item) => `            <li>${escapeHtml(item)}</li>`)
        .join("\n");

      return `        <li class="release-card">
          <div class="release-header">
            <h3>v${escapeHtml(rel.version)} <span class="build-number">(Build ${rel.build_number})</span></h3>
            <span class="badge ${escapeHtml(rel.channel)}">${escapeHtml(rel.channel)}</span>
          </div>
          <div class="meta-row">
            <span>${escapeHtml(releaseDateLabel)}${escapeHtml(rel.release_date)}</span> · <span>${escapeHtml(minSdkLabel)}${rel.min_sdk}+</span>
          </div>
          <div class="download-action">
            <a class="download-button" href="${escapeHtml(rel.download_url)}">${escapeHtml(downloadButtonText)}</a>
          </div>
          <div class="checksum-block">
            <span class="checksum-label">${escapeHtml(checksumLabel)}</span>
            <code class="checksum">${escapeHtml(rel.sha256)}</code>
          </div>
          <div class="changelog-block">
            <h4>${escapeHtml(changelogHeading)}</h4>
            <ul>
${changelogItems}
            </ul>
          </div>
        </li>`;
    })
    .join("\n");

  return `      <section class="releases-section">
        <h2>${escapeHtml(availableHeading)}</h2>
        <ul class="release-list">
${items}
        </ul>
      </section>`;
}

export function renderVerificationSection(
  locale: string = "zh-CN",
  config?: SiteConfig
): string {
  const cfg = config ?? getSiteConfig();
  const locCfg = getLocaleConfig(locale, cfg);
  const ui = locCfg.ui?.download;

  const heading = ui?.verificationHeading ?? "安装包真实性与签名校验";
  const intro = ui?.verificationIntro ?? "为确保您的设备安全，避免运行恶意篡改版本，在安装从网络下载的 APK 前，请务必进行 SHA-256 校验和核对与官方数字签名验证。";
  const step1Heading = ui?.step1Heading ?? "1. SHA-256 校验和比对";
  const step1Body = ui?.step1Body ?? "在本地终端运行系统工具计算下载文件的 SHA-256 哈希，核对是否与官方清单中给出的校验值完全一致：";
  const step2Heading = ui?.step2Heading ?? "2. 官方数字签名验证 (APK Signature Scheme)";
  const step2Body1 = ui?.step2Body1 ?? "谜序官方构建使用发布证书进行 APK Signature Scheme (v2/v3) 签名。您可使用 Android SDK 提供的 <code>apksigner</code> 工具验证签名真实性：";
  const step2Body2 = ui?.step2Body2 ?? "验证结果中必须包含 <code>Verified using v2 scheme (APK Signature Scheme v2): true</code>（或 v3 为 <code>true</code>），且证书指纹与官方公布的指纹一致。";
  const step3Heading = ui?.step3Heading ?? "3. 官方发布渠道与源码构建";
  const step3Body = ui?.step3Body ?? "官方安装包仅通过本站及 GitHub 官方 Releases 页面发布：<a href=\"https://github.com/mixu-app/mixu-client\" target=\"_blank\" rel=\"noopener noreferrer\">https://github.com/mixu-app/mixu-client</a>。请勿在任何未经验证的第三方应用市场或网盘下载安装包。您也可以直接获取客户端开源代码，在本地使用 Android Studio / Gradle 进行构建。";

  const linuxLabel = locale === "en" ? "Linux / macOS:" : "Linux / macOS：";
  const winLabel = locale === "en" ? "Windows (PowerShell):" : "Windows (PowerShell)：";

  return `      <section class="verification-section">
        <h2>${escapeHtml(heading)}</h2>
        <p>
          ${escapeHtml(intro)}
        </p>

        <h3>${escapeHtml(step1Heading)}</h3>
        <p>
          ${escapeHtml(step1Body)}
        </p>
        <p><strong>${linuxLabel}</strong></p>
        <pre><code>sha256sum mixu-app-*.apk</code></pre>
        <p><strong>${winLabel}</strong></p>
        <pre><code>Get-FileHash .\\mixu-app-*.apk -Algorithm SHA256</code></pre>

        <h3>${escapeHtml(step2Heading)}</h3>
        <p>
          ${step2Body1}
        </p>
        <pre><code>apksigner verify --verbose mixu-app-*.apk</code></pre>
        <p>
          ${step2Body2}
        </p>

        <h3>${escapeHtml(step3Heading)}</h3>
        <p>
          ${step3Body}
        </p>
      </section>`;
}

export function renderDownloadPage(
  manifest: DownloadManifest,
  templateHtml: string,
  locale: string = "zh-CN",
  config?: SiteConfig
): string {
  const cfg = config ?? getSiteConfig();
  const locCfg = getLocaleConfig(locale, cfg);
  const ui = locCfg.ui?.download;

  const releasesContent = renderReleasesSection(manifest.releases, locale, cfg);
  const verificationSection = renderVerificationSection(locale, cfg);
  const langSwitcher = renderLangSwitcher(locale, "download", cfg);
  const assetPrefix = locale === "zh-CN" ? "." : "..";

  return templateHtml
    .replaceAll("{{HTML_LANG}}", locale)
    .replaceAll("{{PAGE_TITLE}}", locCfg.pages.download?.title ?? `${locCfg.siteName} — Download`)
    .replaceAll("{{PAGE_DESCRIPTION}}", locCfg.pages.download?.description ?? locCfg.tagline)
    .replaceAll("{{CANONICAL_URL}}", getCanonicalUrl(locCfg.pages.download?.path ?? "/download.html", cfg))
    .replaceAll("{{OG_SITE_NAME}}", locCfg.siteName)
    .replaceAll("{{OG_LOCALE}}", locCfg.ogLocale)
    .replaceAll("{{ASSET_PREFIX}}", assetPrefix)
    .replaceAll("{{LANG_SWITCHER}}", langSwitcher)
    .replaceAll("{{NAV_HOME_HREF}}", "./index.html")
    .replaceAll("{{NAV_BACK_HOME}}", locCfg.ui?.backHome ?? "← 返回首页")
    .replaceAll("{{MARK_ALT}}", locCfg.siteName)
    .replaceAll("{{DOWNLOAD_HEADING}}", ui?.heading ?? "客户端下载")
    .replaceAll("{{DOWNLOAD_INTRO}}", ui?.intro ?? "")
    .replaceAll("{{VERIFICATION_SECTION}}", verificationSection)
    .replaceAll("{{DISCLAIMER}}", ui?.disclaimer ?? "「不剧透」是工程目标：按阅读进度做确定性过滤，并有可失败的回归测试；它不等于数学保证。")
    .replace("<!-- {{RELEASES_CONTENT}} -->", releasesContent);
}

export function run(options?: {
  manifestPath?: string;
  templatePath?: string;
  outputPath?: string;
  locale?: string;
}): void {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const manifestPath = options?.manifestPath ?? resolve(rootDir, "content/download-manifest.json");
  const templatePath = options?.templatePath ?? resolve(rootDir, "src/download.template.html");

  const manifestJson = readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestJson) as DownloadManifest;
  const templateHtml = readFileSync(templatePath, "utf-8");
  const cfg = getSiteConfig();

  if (options?.outputPath) {
    const locale = options.locale ?? "zh-CN";
    const renderedHtml = renderDownloadPage(manifest, templateHtml, locale, cfg);
    const outDir = dirname(options.outputPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(options.outputPath, renderedHtml, "utf-8");
    console.log(`Rendered download page [${locale}] to ${options.outputPath}`);
    return;
  }

  // Render for all supported locales
  for (const loc of cfg.supportedLocales) {
    const outputPath = loc === "zh-CN"
      ? resolve(rootDir, "src/download.html")
      : resolve(rootDir, `src/${loc}/download.html`);

    const outDir = dirname(outputPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const renderedHtml = renderDownloadPage(manifest, templateHtml, loc, cfg);
    writeFileSync(outputPath, renderedHtml, "utf-8");
    console.log(`Rendered download page [${loc}] to ${outputPath}`);
  }
}

// Run automatically when executed directly via Bun
if (import.meta.main) {
  run();
}
