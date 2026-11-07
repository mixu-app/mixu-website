// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getLocaleConfig, getSiteConfig } from "./site-config.ts";

/**
 * Processes template HTML into final 404 page HTML, filling in configurable metadata.
 */
export function render404Page(templateHtml: string, locale?: string): string {
  const cfg = getSiteConfig();
  const locCfg = getLocaleConfig(locale, cfg);
  const notFoundPage = locCfg.pages["notFound"];

  let rendered = templateHtml;
  if (notFoundPage) {
    if (notFoundPage.heading) {
      rendered = rendered.replaceAll("{{NOT_FOUND_HEADING}}", notFoundPage.heading);
    }
    if (notFoundPage.subhead) {
      rendered = rendered.replaceAll("{{NOT_FOUND_SUBHEAD}}", notFoundPage.subhead);
    }
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
  const outputPath = options?.outputPath ?? resolve(rootDir, "src/404.html");

  const templateHtml = readFileSync(templatePath, "utf-8");
  const renderedHtml = render404Page(templateHtml, options?.locale);
  writeFileSync(outputPath, renderedHtml, "utf-8");
  console.log(`Rendered 404 page to ${outputPath}`);
}

if (import.meta.main) {
  run();
}
