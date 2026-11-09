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

interface LocalizedLandingCopy {
  navFeatures: string;
  navShowcase: string;
  navDownload: string;
  einkToggleLabel: string;
  releaseBadge: string;
  quickDownloadText: string;
  showcaseTitle: string;
  showcaseSubtitle: string;
  step1Label: string;
  step2Label: string;
  step3Label: string;
  firewallLabel: string;
  firewallStatus: string;
  node1Title: string;
  node1Role: string;
  node1Quote: string;
  node2Title: string;
  node2Role: string;
  node2Quote: string;
  node3Title: string;
  node3Role: string;
  node3Quote: string;
  node4LockedTitle: string;
  node4LockedReason: string;
  archHeading: string;
  archSubtitle: string;
  modClientDesc: string;
  modGraphDesc: string;
  modRendererDesc: string;
  modContractsDesc: string;
  privacyLinkText: string;
  termsLinkText: string;
  icpNote: string;
}

function getLandingCopy(locale: string): LocalizedLandingCopy {
  if (locale === "en") {
    return {
      navFeatures: "Core Values",
      navShowcase: "Interactive Board",
      navDownload: "Download v0.0.1",
      einkToggleLabel: "E-Ink Mode",
      releaseBadge: "v0.0.1 Alpha · Android APK Available",
      quickDownloadText: "Download v0.0.1 APK (SHA-256 Verified) →",
      showcaseTitle: "Interactive Reading Horizon Preview",
      showcaseSubtitle:
        "Slide your reading progress to see how Mixu projects the narrative graph P(G, h) and blocks future chapters deterministically.",
      step1Label: "Ch. 2 · 15% (Manor Arrival)",
      step2Label: "Ch. 8 · 48% (Alibi Broken)",
      step3Label: "Ch. 12 · 72% ( Chiming Clock)",
      firewallLabel: "Anti-Spoiler Firewall P(G, h)",
      firewallStatus: "14 future nodes & 29 edges strictly filtered beyond current offset",
      node1Title: "Lin Shen (Archivist)",
      node1Role: "OBSERVED · Ch. 1 Paragraph 4",
      node1Quote: "\"Entered the study at 21:15 carrying the brass ledger key.\"",
      node2Title: "Su Wan (Heir)",
      node2Role: "CLAIMED · Ch. 2 Paragraph 19",
      node2Quote: "\"Claims she never left the greenhouse between 21:00 and 22:00.\"",
      node3Title: "Stopped Pocket Watch (21:38)",
      node3Role: "CONTRADICTED · Ch. 8 Paragraph 11",
      node3Quote: "\"Found beneath the greenhouse grates—contradicts Su Wan's alibi.\"",
      node4LockedTitle: "[LOCKED] Ch. 24 Cellar Confession",
      node4LockedReason: "Blocked by Horizon Filter: first_reveal_offset (Ch. 24) > current_reading_offset",
      archHeading: "Open-Core Architecture",
      archSubtitle:
        "Built with Kotlin Multiplatform. Core narrative graph, spoiler firewall, and E-Ink canvas renderer are open-source and verifiable.",
      modClientDesc: "Android & KMP offline-first EPUB/TXT reader, local SQLite storage, and interactive CaseBoard UI.",
      modGraphDesc: "Temporal narrative property graph & deterministic knowledge-horizon projection P(G, h).",
      modRendererDesc: "Compose Canvas force-directed graph layout with 1-bit E-Ink high-contrast rendering policy.",
      modContractsDesc: "JSON Schema graph pack specifications, HTTP API contracts, and CC0 spoiler regression fixtures.",
      privacyLinkText: "Privacy Policy",
      termsLinkText: "Terms of Service",
      icpNote: "mixuread.com · Open-Core Mystery Reader",
    };
  }

  if (locale === "ja") {
    return {
      navFeatures: "3つの価値",
      navShowcase: "捜査ボード実演",
      navDownload: "v0.0.1 ダウンロード",
      einkToggleLabel: "E-Ink モード",
      releaseBadge: "v0.0.1 Alpha · Android APK 公開中",
      quickDownloadText: "v0.0.1 APK をダウンロード（SHA-256 署名検証済）→",
      showcaseTitle: "読書進度連動・捜査ボードプレビュー",
      showcaseSubtitle:
        "読書進度を切り替えると、知識ホライズン投影 P(G, h) が未来の章のネタバレをどのように遮断するか体験できます。",
      step1Label: "第2章 · 15%（館への到着）",
      step2Label: "第8章 · 48%（アリバイの矛盾）",
      step3Label: "第12章 · 72%（時計塔の証言）",
      firewallLabel: "ネタバレ防止ファイアウォール P(G, h)",
      firewallStatus: "現在の読書位置より先の14ノード・29エッジを決定論的に遮断中",
      node1Title: "リン・シェン（記録係）",
      node1Role: "OBSERVED · 第1章 第4段落",
      node1Quote: "「21時15分、真鍮の鍵を持って書斎へ入った。」",
      node2Title: "スー・ワン（相続人）",
      node2Role: "CLAIMED · 第2章 第19段落",
      node2Quote: "「21時から22時の間、温室から一歩も出ていないと主張。」",
      node3Title: "止まった懐中時計 (21:38)",
      node3Role: "CONTRADICTED · 第8章 第11段落",
      node3Quote: "「温室の格子下で発見。スー・ワンの不在証明と矛盾する。」",
      node4LockedTitle: "[未解放] 第24章 地下室の真相",
      node4LockedReason: "ホライズンフィルタにより遮断：初出位置 (第24章) > 現在の読書位置",
      archHeading: "オープンコア・アーキテクチャ",
      archSubtitle:
        "Kotlin Multiplatform 製。物語グラフモデル、ネタバレ防止フィルタ、E-Ink レンダラはオープンソースで検証可能です。",
      modClientDesc: "Android / KMP オフライン優先 EPUB・TXT リーダー、ローカル SQLite、捜査ボード UI。",
      modGraphDesc: "時系列ナラティブグラフと決定論的知識ホライズン投影エンジン P(G, h)。",
      modRendererDesc: "Compose Canvas グラフレイアウトと E-Ink 電子ペーパー向け高コントラスト描画。",
      modContractsDesc: "JSON Schema グラフパック仕様、HTTP 契約、および CC0 ネタバレ回帰テストコーパス。",
      privacyLinkText: "プライバシーポリシー",
      termsLinkText: "利用規約",
      icpNote: "mixuread.com · Open-Core Mystery Reader",
    };
  }

  return {
    navFeatures: "核心价值",
    navShowcase: "案情板演示",
    navDownload: "下载 v0.0.1",
    einkToggleLabel: "E-Ink 墨水屏模式",
    releaseBadge: "v0.0.1 Alpha · Android 签名安装包已发布",
    quickDownloadText: "下载 v0.0.1 客户端 APK（附 SHA-256 签名校验）→",
    showcaseTitle: "按阅读进度展开的案情板（交互演示）",
    showcaseSubtitle:
      "点击切换下方阅读进度游标，直观体验确定性知识视界投影 P(G, h) 如何随章节解锁线索、标记证言矛盾并拦截未来剧透。",
    step1Label: "第 2 章 · 15%（初抵雾庄）",
    step2Label: "第 8 章 · 48%（不在场证明破裂）",
    step3Label: "第 12 章 · 72%（钟楼密道浮现）",
    firewallLabel: "防剧透防火墙 P(G, h)",
    firewallStatus: "已确定性拦截当前进度之后的 14 个未来节点与 29 条关系边",
    node1Title: "林深（档案管理员）",
      node1Role: "OBSERVED · 第 1 章 第 4 段",
      node1Quote: "“21:15 持黄铜账本钥匙进入书房，袖口沾有冷杉树脂。”",
      node2Title: "苏晚（庄园继承人）",
      node2Role: "CLAIMED · 第 2 章 第 19 段",
      node2Quote: "“自称 21:00 至 22:00 一直在玻璃花房修剪白山茶，未曾离开。”",
      node3Title: "停摆的怀表 (21:38)",
      node3Role: "CONTRADICTED · 第 8 章 第 11 段",
      node3Quote: "“在花房排水格栅下寻获，表壳刻痕与苏晚的证言直接矛盾。”",
      node4LockedTitle: "[已锁止] 第 24 章 地下酒窖真相",
      node4LockedReason: "已被知识视界过滤器拦截：首次揭示偏移量 (第 24 章) > 当前阅读位置",
      archHeading: "开源核心架构 (Open-Core)",
      archSubtitle:
        "基于 Kotlin Multiplatform 构建。时序叙事图谱、防剧透防火墙与墨水屏渲染引擎全部开源可审计，本地离线即可完整运行。",
      modClientDesc: "Android / KMP 离线优先阅读器，支持本地 EPUB/TXT 导入、案情板交互与原文回跳。",
      modGraphDesc: "时序叙事属性图模型与确定性知识视界投影算子 P(G, h)。",
      modRendererDesc: "Compose Canvas 案情板布局引擎，内置 1-bit E-Ink 墨水屏高对比度无动画策略。",
      modContractsDesc: "JSON Schema 图谱包契约、HTTP 协议规范与 CC0 零版权防剧透回归测试语料库。",
      privacyLinkText: "隐私政策",
      termsLinkText: "服务条款",
      icpNote: "mixuread.com · 谜序 Mixu 悬疑推理伴读工具",
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
  const copy = getLandingCopy(locale);

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
      <div class="site-topbar">
        <a class="brand-lockup" href="./index.html">
          <img class="mark" src="${assetPrefix}/logo-mark.svg" alt="${escapeHtml(locCfg.siteName)}" width="40" height="40" />
          <span class="brand-name">${escapeHtml(locCfg.siteName)}</span>
        </a>
        <div class="topbar-actions">
          <nav class="topbar-nav" aria-label="Primary">
            <a href="#showcase">${escapeHtml(copy.navShowcase)}</a>
            <a href="#demo">${escapeHtml(copy.navFeatures)}</a>
            <a class="topbar-download-pill" href="./download.html">${escapeHtml(copy.navDownload)}</a>
          </nav>
          <button type="button" id="eink-toggle" class="eink-toggle-btn" aria-pressed="false">${escapeHtml(copy.einkToggleLabel)}</button>
          ${langSwitcher}
        </div>
      </div>

      <header class="hero-header">
        <div class="hero-badge-row">
          <a class="release-pill" href="./download.html">
            <span class="release-dot" aria-hidden="true"></span>
            <span>${escapeHtml(copy.releaseBadge)}</span>
          </a>
        </div>
        <h1>${data.headline}</h1>
        ${data.subheadHtml}
        <div class="cta-group">
          ${ctasHtml}
        </div>
        <div class="hero-quick-download">
          <a href="./download.html">${escapeHtml(copy.quickDownloadText)}</a>
        </div>
      </header>

      <section id="showcase" class="section showcase-section">
        <div class="showcase-header">
          <h2>${escapeHtml(copy.showcaseTitle)}</h2>
          <p class="showcase-sub">${escapeHtml(copy.showcaseSubtitle)}</p>
        </div>

        <div class="horizon-controls" role="tablist" aria-label="${escapeHtml(copy.showcaseTitle)}">
          <button type="button" class="horizon-step-btn active" data-horizon-step="0" role="tab" aria-selected="true">
            ${escapeHtml(copy.step1Label)}
          </button>
          <button type="button" class="horizon-step-btn" data-horizon-step="1" role="tab" aria-selected="false">
            ${escapeHtml(copy.step2Label)}
          </button>
          <button type="button" class="horizon-step-btn" data-horizon-step="2" role="tab" aria-selected="false">
            ${escapeHtml(copy.step3Label)}
          </button>
        </div>

        <div class="caseboard-stage" id="horizon-board" data-active-step="0">
          <div class="firewall-banner">
            <span class="firewall-tag">${escapeHtml(copy.firewallLabel)}</span>
            <span class="firewall-desc" id="firewall-status-text">${escapeHtml(copy.firewallStatus)}</span>
          </div>

          <div class="caseboard-grid">
            <article class="clue-node status-observed" data-min-step="0">
              <div class="clue-node-header">
                <span class="epistemic-badge badge-observed">OBSERVED</span>
                <span class="clue-locus">${escapeHtml(copy.node1Role)}</span>
              </div>
              <h3>${escapeHtml(copy.node1Title)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node1Quote)}</p>
            </article>

            <article class="clue-node status-claimed" data-min-step="0">
              <div class="clue-node-header">
                <span class="epistemic-badge badge-claimed">CLAIMED</span>
                <span class="clue-locus">${escapeHtml(copy.node2Role)}</span>
              </div>
              <h3>${escapeHtml(copy.node2Title)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node2Quote)}</p>
            </article>

            <article class="clue-node status-contradicted" data-min-step="1">
              <div class="clue-node-header">
                <span class="epistemic-badge badge-contradicted">CONTRADICTED</span>
                <span class="clue-locus">${escapeHtml(copy.node3Role)}</span>
              </div>
              <h3>${escapeHtml(copy.node3Title)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node3Quote)}</p>
            </article>

            <article class="clue-node status-locked" data-min-step="99" aria-disabled="true">
              <div class="clue-node-header">
                <span class="epistemic-badge badge-locked">HORIZON GUARD</span>
                <span class="clue-locus">P(G, h)</span>
              </div>
              <h3>${escapeHtml(copy.node4LockedTitle)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node4LockedReason)}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="demo" class="section values">
        <h2>${valuesHeading}</h2>
        ${data.valuesHtml}
      </section>

      <div class="dual-section-grid">
        <section class="section audience">
          <h2>${audienceHeading}</h2>
          ${data.audienceHtml}
        </section>

        <section class="section limitations">
          <h2>${limitationsHeading}</h2>
          ${data.limitationsHtml}
        </section>
      </div>

      <section class="section architecture-section">
        <h2>${escapeHtml(copy.archHeading)}</h2>
        <p class="showcase-sub">${escapeHtml(copy.archSubtitle)}</p>
        <div class="arch-grid">
          <a class="arch-card" href="https://github.com/mixu-app/mixu-client" target="_blank" rel="noopener noreferrer">
            <div class="arch-card-top">
              <strong>mixu-client</strong>
              <span class="license-pill">MPL-2.0</span>
            </div>
            <p>${escapeHtml(copy.modClientDesc)}</p>
          </a>
          <a class="arch-card" href="https://github.com/mixu-app/mixu-spoiler" target="_blank" rel="noopener noreferrer">
            <div class="arch-card-top">
              <strong>mixu-graph &amp; mixu-spoiler</strong>
              <span class="license-pill">Apache-2.0</span>
            </div>
            <p>${escapeHtml(copy.modGraphDesc)}</p>
          </a>
          <a class="arch-card" href="https://github.com/mixu-app/mixu-renderer" target="_blank" rel="noopener noreferrer">
            <div class="arch-card-top">
              <strong>mixu-renderer</strong>
              <span class="license-pill">Apache-2.0</span>
            </div>
            <p>${escapeHtml(copy.modRendererDesc)}</p>
          </a>
          <a class="arch-card" href="https://github.com/mixu-app/mixu-contracts" target="_blank" rel="noopener noreferrer">
            <div class="arch-card-top">
              <strong>mixu-contracts &amp; fixtures</strong>
              <span class="license-pill">Apache-2.0 / CC0</span>
            </div>
            <p>${escapeHtml(copy.modContractsDesc)}</p>
          </a>
        </div>
      </section>

      <footer class="footer-disclaimers note">
        ${data.disclaimersHtml}
        <div class="footer-meta-links">
          <span>${escapeHtml(copy.icpNote)}</span>
          <span class="footer-sep">·</span>
          <a href="${assetPrefix}/privacy.html">${escapeHtml(copy.privacyLinkText)}</a>
          <span class="footer-sep">·</span>
          <a href="${assetPrefix}/terms.html">${escapeHtml(copy.termsLinkText)}</a>
          <span class="footer-sep">·</span>
          <a href="https://github.com/mixu-app/mixu" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
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
