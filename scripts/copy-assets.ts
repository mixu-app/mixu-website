// SPDX-License-Identifier: Apache-2.0
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateRobotsTxt, generateSitemapXml, getSiteConfig } from "./site-config.ts";

export function copyAssets(options?: { srcDir?: string; distDir?: string }): string[] {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const srcDir = options?.srcDir ?? resolve(rootDir, "src");
  const distDir = options?.distDir ?? resolve(rootDir, "dist");
  const siteConfig = getSiteConfig();

  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // 1. Generate/sync robots.txt and sitemap.xml in src
  const robotsTxt = generateRobotsTxt(siteConfig);
  const sitemapXml = generateSitemapXml(siteConfig);

  writeFileSync(resolve(srcDir, "robots.txt"), robotsTxt, "utf-8");
  writeFileSync(resolve(srcDir, "sitemap.xml"), sitemapXml, "utf-8");

  // 2. Also write directly to dist
  writeFileSync(resolve(distDir, "robots.txt"), robotsTxt, "utf-8");
  writeFileSync(resolve(distDir, "sitemap.xml"), sitemapXml, "utf-8");

  const assetsToCopy = ["og.png", "og.svg", "privacy.html", "terms.html"];
  const copied: string[] = ["robots.txt", "sitemap.xml"];

  for (const asset of assetsToCopy) {
    const srcPath = resolve(srcDir, asset);
    const destPath = resolve(distDir, asset);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      copied.push(asset);
    }
  }

  const screenshotsSrcDir = resolve(srcDir, "screenshots");
  const screenshotsDistDir = resolve(distDir, "screenshots");
  if (existsSync(screenshotsSrcDir)) {
    mkdirSync(screenshotsDistDir, { recursive: true });
    for (const file of readdirSync(screenshotsSrcDir)) {
      if (file.endsWith(".png") || file.endsWith(".webp") || file.endsWith(".jpg")) {
        copyFileSync(resolve(screenshotsSrcDir, file), resolve(screenshotsDistDir, file));
        copied.push(`screenshots/${file}`);
      }
    }
  }

  return copied;
}

if (import.meta.main) {
  const copied = copyAssets();
  console.log(`Synced and copied static assets to dist: ${copied.join(", ")}`);
}
