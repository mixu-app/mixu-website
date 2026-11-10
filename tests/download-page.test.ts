import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  escapeHtml,
  renderDownloadPage,
  renderReleasesSection,
  run as runDownload,
  type DownloadManifest,
  type Release,
} from "../scripts/render-download.ts";

const manifestPath = resolve(
  import.meta.dir,
  "../content/download-manifest.json",
);
const schemaPath = resolve(
  import.meta.dir,
  "../content/download-manifest.schema.json",
);
const templatePath = resolve(import.meta.dir, "../src/download.template.html");
const sourceHtmlPath = resolve(import.meta.dir, "../src/download.html");
const distHtmlPath = resolve(import.meta.dir, "../dist/download.html");

describe("download manifest and schema", () => {
  test("schema specifies required release properties", () => {
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    expect(schema.required).toContain("schema_version");
    expect(schema.required).toContain("releases");

    const releaseItemProps = schema.properties.releases.items.properties;
    expect(releaseItemProps).toHaveProperty("version");
    expect(releaseItemProps).toHaveProperty("build_number");
    expect(releaseItemProps).toHaveProperty("channel");
    expect(releaseItemProps).toHaveProperty("release_date");
    expect(releaseItemProps).toHaveProperty("download_url");
    expect(releaseItemProps).toHaveProperty("sha256");
    expect(releaseItemProps).toHaveProperty("min_sdk");
    expect(releaseItemProps).toHaveProperty("changelog_zh");
  });

  test("manifest contains official v0.0.1 alpha release", () => {
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf-8"),
    ) as DownloadManifest;
    expect(manifest.schema_version).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(manifest.releases)).toBe(true);
    expect(manifest.releases.length).toBeGreaterThanOrEqual(1);
    expect(manifest.releases[0]?.version).toBe("0.0.1");
    expect(manifest.releases[0]?.download_url).toBe(
      "https://mixuread.com/releases/v0.0.1/mixu-app-0.0.1.apk",
    );
    expect(manifest.releases[0]?.sha256).toBe(
      "2b435fa4e6c34571c3dbb5c2b8e3514bcf6f057299f6366b64258c902e5caa93",
    );
  });
});

describe("download page content and phase honesty", () => {
  beforeAll(() => {
    runDownload();
  });

  test("renders the official v0.0.1 release card with SHA-256 checksum", () => {
    const html = readFileSync(sourceHtmlPath, "utf-8");
    expect(html).toContain('class="release-card"');
    expect(html).toContain("v0.0.1");
    expect(html).toContain('download="mixu-app-0.0.1.apk"');
    expect(html).toContain(
      "https://mixuread.com/releases/v0.0.1/mixu-app-0.0.1.apk",
    );
    expect(html).toContain(
      "2b435fa4e6c34571c3dbb5c2b8e3514bcf6f057299f6366b64258c902e5caa93",
    );
  });

  test("provides link back to main page and client repository", () => {
    const html = readFileSync(sourceHtmlPath, "utf-8");
    expect(html).toContain('href="./index.html"');
    expect(html).toContain("https://github.com/mixu-app/mixu-client");
  });

  test("includes visual branding elements", () => {
    const html = readFileSync(sourceHtmlPath, "utf-8");
    expect(html).toContain("logo-mark.svg");
    expect(html).toContain("style.css");
    expect(html).toContain("客户端下载");
  });

  test("documents signature and checksum verification process", () => {
    const html = readFileSync(sourceHtmlPath, "utf-8");
    expect(html).toContain("SHA-256 校验和");
    expect(html).toContain("sha256sum");
    expect(html).toContain("Get-FileHash");
    expect(html).toContain("APK Signature Scheme");
    expect(html).toContain("apksigner");
  });
});

describe("render-download generator logic", () => {
  test("escapes HTML special characters in release content", () => {
    const raw = "<script>alert(\"xss\")</script> & 'test'";
    const escaped = escapeHtml(raw);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("&amp;");
    expect(escaped).toContain("&quot;");
  });

  test("renders release items when manifest contains releases", () => {
    const sampleRelease: Release = {
      version: "0.1.0",
      build_number: 1,
      channel: "alpha",
      release_date: "2026-11-08",
      download_url:
        "https://github.com/mixu-app/mixu-client/releases/download/v0.1.0/mixu-v0.1.0.apk",
      sha256:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      min_sdk: 26,
      changelog_zh: ["首个测试版本", "案情板初始原型"],
    };

    const rendered = renderReleasesSection([sampleRelease]);
    expect(rendered).toContain("v0.1.0");
    expect(rendered).toContain("Build 1");
    expect(rendered).toContain("alpha");
    expect(rendered).toContain("2026-11-08");
    expect(rendered).toContain("Android API 26+");
    expect(rendered).toContain(sampleRelease.download_url);
    expect(rendered).toContain(sampleRelease.sha256);
    expect(rendered).toContain("首个测试版本");
    expect(rendered).toContain("案情板初始原型");
    expect(rendered).toContain("release-card");
  });

  test("renderDownloadPage replaces placeholder correctly", () => {
    const template = "<html><!-- {{RELEASES_CONTENT}} --></html>";
    const manifest: DownloadManifest = {
      schema_version: 1,
      releases: [],
    };
    const result = renderDownloadPage(manifest, template);
    expect(result).not.toContain("<!-- {{RELEASES_CONTENT}} -->");
    expect(result).toContain(
      "当前处于文档与开发起步阶段，尚未发布公开安装包 (APK)",
    );
  });
});

describe("built distribution artifact", () => {
  beforeAll(() => {
    // Ensure build is executed
    Bun.spawnSync(["bun", "run", "render:download"]);
    Bun.spawnSync(["bun", "run", "build"]);
  });

  test("dist/download.html exists and contains bundled content", () => {
    expect(existsSync(distHtmlPath)).toBe(true);
    const distHtml = readFileSync(distHtmlPath, "utf-8");
    expect(distHtml).toContain("v0.0.1");
    expect(distHtml).toContain(
      "2b435fa4e6c34571c3dbb5c2b8e3514bcf6f057299f6366b64258c902e5caa93",
    );
    expect(distHtml).toContain("sha256sum");
    expect(distHtml).toContain("apksigner");
    expect(distHtml).toContain("https://github.com/mixu-app/mixu-client");
  });
});
