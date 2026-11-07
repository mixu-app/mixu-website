import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

/**
 * Parses the Markdown source of hero.zh-CN.md into structured hero content.
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

  // 1. Headline
  const headlineSec = getSection((t) => t.includes("主标题"), "## 主标题");
  const firstLine = headlineSec.body.split("\n")[0]?.trim() ?? "";
  const headline = firstLine.replace(/^\*\*|\*\*$/g, "").trim();
  if (!headline) {
    throw new Error("Headline copy in ## 主标题 cannot be empty");
  }

  // 2. Subhead
  const subheadSec = getSection((t) => t.includes("副标题"), "## 副标题");
  const subheadHtml = Bun.markdown
    .html(subheadSec.body)
    .replaceAll("&quot;", '"')
    .trim()
    .replace(/^<p>/, '<p class="subhead">');

  // 3. Values
  const valuesSec = getSection((t) => t.includes("价值"), "## 三条价值");
  const valuesHtml = Bun.markdown.html(valuesSec.body).replaceAll("&quot;", '"').trim();

  // 4. Audience
  const audienceSec = getSection((t) => t.includes("适合谁") && !t.includes("不适合"), "## 适合谁");
  const audienceHtml = Bun.markdown.html(audienceSec.body).replaceAll("&quot;", '"').trim();

  // 5. Limitations
  const limitationsSec = getSection((t) => t.includes("不适合"), "## 不适合谁（诚实说明）");
  const limitationsHtml = Bun.markdown.html(limitationsSec.body).replaceAll("&quot;", '"').trim();

  // 6. CTAs
  const ctaSec = getSection((t) => t.includes("按钮") || t.includes("CTA"), "## 主按钮");
  const ctas: HeroCta[] = [];
  for (const line of ctaSec.body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("-")) continue;
    const match = trimmed.match(/^-\s*(主|次)[：:]\s*\*\*(.+?)\*\*\s*(.+)?$/);
    if (match && match[1] && match[2]) {
      const isPrimary = match[1] === "主";
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
    throw new Error("Missing CTA buttons in ## 主按钮");
  }

  // 7. Disclaimers
  const disclaimersSec = getSection((t) => t.includes("声明") || t.includes("页脚"), "## 页脚声明（必须保留）");
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
 * Formats the parsed hero data into semantic HTML elements.
 */
export function renderHeroHtml(data: HeroData): string {
  const ctasHtml = data.ctas
    .map((cta) => {
      const cls = cta.isPrimary ? "cta cta-primary" : "cta cta-secondary";
      const target = cta.href.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
      const hintHtml = cta.hint ? ` <span class="cta-hint">${cta.hint}</span>` : "";
      return `<a class="${cls}" href="${cta.href}"${target}><span class="cta-label">${cta.label}</span>${hintHtml}</a>`;
    })
    .join("\n        ");

  return `
      <header class="hero-header">
        <img class="mark" src="./logo-mark.svg" alt="谜序 Mixu" width="56" height="56" />
        <h1>${data.headline}</h1>
        ${data.subheadHtml}
        <div class="cta-group">
          ${ctasHtml}
        </div>
      </header>

      <section id="demo" class="section values">
        <h2>三条价值</h2>
        ${data.valuesHtml}
      </section>

      <section class="section audience">
        <h2>适合谁</h2>
        ${data.audienceHtml}
      </section>

      <section class="section limitations">
        <h2>不适合谁（诚实说明）</h2>
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
  outputPath?: string
): { data: HeroData; html: string; outputPath: string } {
  const resolvedContent = contentPath ?? resolve(import.meta.dir, "../content/hero.zh-CN.md");
  const resolvedTemplate = templatePath ?? resolve(import.meta.dir, "../src/index.template.html");
  const resolvedOutput = outputPath ?? resolve(import.meta.dir, "../src/index.html");

  if (!existsSync(resolvedContent)) {
    throw new Error(`Missing content file: ${resolvedContent}`);
  }
  if (!existsSync(resolvedTemplate)) {
    throw new Error(`Missing template file: ${resolvedTemplate}`);
  }

  const rawMarkdown = readFileSync(resolvedContent, "utf-8");
  const data = parseHeroMarkdown(rawMarkdown);
  const heroHtml = renderHeroHtml(data);

  const rawTemplate = readFileSync(resolvedTemplate, "utf-8");
  const fullHtml = rawTemplate
    .replaceAll("{{HERO_HEADLINE}}", data.headline)
    .replace("<!-- HERO_CONTENT -->", heroHtml)
    .replace("{{HERO_CONTENT}}", heroHtml);

  writeFileSync(resolvedOutput, fullHtml, "utf-8");

  return {
    data,
    html: fullHtml,
    outputPath: resolvedOutput,
  };
}

if (import.meta.main) {
  try {
    const res = renderHero();
    console.log(`Rendered hero content successfully into: ${res.outputPath}`);
  } catch (err) {
    console.error(`Build Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
