import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface Release {
  version: string;
  build_number: number;
  channel: "alpha" | "beta" | "stable" | string;
  release_date: string;
  download_url: string;
  sha256: string;
  min_sdk: number;
  changelog_zh: string[];
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

export function renderReleasesSection(releases: Release[]): string {
  if (!releases || releases.length === 0) {
    return `      <section class="callout phase-notice">
        <h2>发布状态</h2>
        <p>
          <strong>当前处于文档与开发起步阶段，尚未发布公开安装包 (APK)。</strong>
        </p>
        <p>
          谜序遵循「文档先行、规约驱动」的原则。待 M0 阅读器基础与 M1 案情板里程碑就绪后，我们将在本页发布首个公开 Alpha 预览版本。
        </p>
        <p>
          欢迎关注开源客户端仓库的最新进展：<a href="https://github.com/mixu-app/mixu-client" target="_blank" rel="noopener noreferrer">github.com/mixu-app/mixu-client</a>。
        </p>
      </section>`;
  }

  const items = releases
    .map((rel) => {
      const changelogItems = rel.changelog_zh
        .map((item) => `            <li>${escapeHtml(item)}</li>`)
        .join("\n");

      return `        <li class="release-card">
          <div class="release-header">
            <h3>v${escapeHtml(rel.version)} <span class="build-number">(Build ${rel.build_number})</span></h3>
            <span class="badge ${escapeHtml(rel.channel)}">${escapeHtml(rel.channel)}</span>
          </div>
          <div class="meta-row">
            <span>发布日期：${escapeHtml(rel.release_date)}</span> · <span>最低系统要求：Android API ${rel.min_sdk}+</span>
          </div>
          <div class="download-action">
            <a class="download-button" href="${escapeHtml(rel.download_url)}">下载 APK</a>
          </div>
          <div class="checksum-block">
            <span class="checksum-label">SHA-256 校验和：</span>
            <code class="checksum">${escapeHtml(rel.sha256)}</code>
          </div>
          <div class="changelog-block">
            <h4>更新日志</h4>
            <ul>
${changelogItems}
            </ul>
          </div>
        </li>`;
    })
    .join("\n");

  return `      <section class="releases-section">
        <h2>可用版本</h2>
        <ul class="release-list">
${items}
        </ul>
      </section>`;
}

export function renderDownloadPage(manifest: DownloadManifest, templateHtml: string): string {
  const content = renderReleasesSection(manifest.releases);
  return templateHtml.replace("<!-- {{RELEASES_CONTENT}} -->", content);
}

export function run(options?: {
  manifestPath?: string;
  templatePath?: string;
  outputPath?: string;
}): void {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const manifestPath = options?.manifestPath ?? resolve(rootDir, "content/download-manifest.json");
  const templatePath = options?.templatePath ?? resolve(rootDir, "src/download.template.html");
  const outputPath = options?.outputPath ?? resolve(rootDir, "src/download.html");

  const manifestJson = readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestJson) as DownloadManifest;
  const templateHtml = readFileSync(templatePath, "utf-8");

  const renderedHtml = renderDownloadPage(manifest, templateHtml);
  writeFileSync(outputPath, renderedHtml, "utf-8");
  console.log(`Rendered download page to ${outputPath}`);
}

// Run automatically when executed directly via Bun
if (import.meta.main) {
  run();
}
