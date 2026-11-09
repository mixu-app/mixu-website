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

  const headlineSec = getSection(
    (t) => /(主标题|主見出し|主タイトル|メイン見出し|headline)/i.test(t),
    "## 主标题 / Headline"
  );
  const firstLine = headlineSec.body.split("\n")[0]?.trim() ?? "";
  const headline = firstLine.replace(/^\*\*|\*\*$/g, "").trim();
  if (!headline) {
    throw new Error("Headline copy in hero markdown cannot be empty");
  }

  const subheadSec = getSection(
    (t) => /(副标题|副見出し|副タイトル|サブ|subhead|subtitle)/i.test(t),
    "## 副标题 / Subhead"
  );
  const subheadHtml = Bun.markdown
    .html(subheadSec.body)
    .replaceAll("&quot;", '"')
    .trim()
    .replace(/^<p>/, '<p class="subhead">');

  const valuesSec = getSection(
    (t) => /(价值|価値|value|feature)/i.test(t),
    "## 三条价值 / Core Values"
  );
  const valuesHtml = Bun.markdown.html(valuesSec.body).replaceAll("&quot;", '"').trim();

  const audienceSec = getSection(
    (t) => /(适合谁|対象読者|おすすめ|who it is for|audience)/i.test(t) && !/(不适合|不適合|対象外|not)/i.test(t),
    "## 适合谁 / Who It Is For"
  );
  const audienceHtml = Bun.markdown.html(audienceSec.body).replaceAll("&quot;", '"').trim();

  const limitationsSec = getSection(
    (t) => /(不适合|不適合|対象外|not for|limitation)/i.test(t),
    "## 不适合谁 / Who It Is Not For"
  );
  const limitationsHtml = Bun.markdown.html(limitationsSec.body).replaceAll("&quot;", '"').trim();

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
        href: isPrimary ? "#gallery" : "https://github.com/mixu-app/mixu-client",
      });
    }
  }

  if (ctas.length === 0) {
    throw new Error("Missing CTA buttons in CTA section");
  }

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

interface ScreenshotItem {
  id: string;
  category: "caseboard" | "reader" | "tools";
  imageFile: string;
  badge: string;
  title: string;
  description: string;
}

interface LocalizedLandingCopy {
  navGallery: string;
  navShowcase: string;
  navFeatures: string;
  navDownload: string;
  einkToggleLabel: string;
  releaseBadge: string;
  quickDownloadText: string;
  heroArtCaption: string;
  heroPreviewCaption: string;
  valArt1Label: string;
  valArt2Label: string;
  valArt3Label: string;
  galleryTitle: string;
  gallerySubtitle: string;
  filterAll: string;
  filterCaseboard: string;
  filterReader: string;
  filterTools: string;
  zoomHint: string;
  lightboxCloseLabel: string;
  screenshots: ScreenshotItem[];
  showcaseTitle: string;
  showcaseSubtitle: string;
  step1Label: string;
  step2Label: string;
  step3Label: string;
  firewallLabel: string;
  firewallStatus: string;
  badgeObservedText: string;
  badgeClaimedText: string;
  badgeContradictedText: string;
  badgeLockedText: string;
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
  highlightsHeading: string;
  highlightsSubtitle: string;
  hl1Title: string;
  hl1Desc: string;
  hl2Title: string;
  hl2Desc: string;
  hl3Title: string;
  hl3Desc: string;
  hl4Title: string;
  hl4Desc: string;
  privacyLinkText: string;
  termsLinkText: string;
  contactLabel: string;
  icpNote: string;
}

function getLandingCopy(locale: string): LocalizedLandingCopy {
  if (locale === "en") {
    return {
      navGallery: "Screenshots",
      navShowcase: "Interactive Demo",
      navFeatures: "Core Values",
      navDownload: "Download v0.0.1",
      einkToggleLabel: "E-Ink Mode",
      releaseBadge: "v0.0.1 Alpha · Android APK Available",
      quickDownloadText: "Download v0.0.1 APK (Verified Package) →",
      heroArtCaption: "Atmospheric Mystery Companion: Read the book, unfold the CaseBoard on your E-Ink tablet or phone",
      heroPreviewCaption: "Live capture: 2D Interactive CaseBoard & Reading Progress Rewind Slider",
      valArt1Label: "01 · Spoiler-Free Reading Horizon",
      valArt2Label: "02 · One-Tap Jump to Source Sentence",
      valArt3Label: "03 · Offline-First & E-Ink Ready",
      galleryTitle: "Real App Screenshots & Feature Tour",
      gallerySubtitle:
        "See how Mixu helps you track characters, verify alibis, look up mystery terminology, and read comfortably across tablets, phones, and E-Ink devices.",
      filterAll: "All Features (8)",
      filterCaseboard: "CaseBoard & Clues (4)",
      filterReader: "Reading & Themes (3)",
      filterTools: "Dictionary & Translation (1)",
      zoomHint: "Click to enlarge",
      lightboxCloseLabel: "Close preview",
      screenshots: [
        {
          id: "shot-caseboard-2d",
          category: "caseboard",
          imageFile: "caseboard-2d.png",
          badge: "CaseBoard · 2D Relationship Map",
          title: "Interactive 2D Suspect & Clue Relationship Board",
          description:
            "Automatically organizes characters, locations, and key evidence from chapters you have already read. Drag nodes freely and rewind the top progress slider to review earlier chapters spoiler-free.",
        },
        {
          id: "shot-caseboard-hierarchy",
          category: "caseboard",
          imageFile: "caseboard-hierarchy.png",
          badge: "CaseBoard · Hierarchy View",
          title: "One-Tap Hierarchical Topology View",
          description:
            "Switch instantly from a force-directed web to a structured top-down hierarchy—ideal for untangling sprawling family trees, manor households, and command chains.",
        },
        {
          id: "shot-caseboard-claims",
          category: "caseboard",
          imageFile: "caseboard-claims.png",
          badge: "Testimonies · Source Jump",
          title: "Testimony & Evidence Checklist with Paragraph Links",
          description:
            "Lists every observed fact and witness statement unlocked so far, complete with chapter anchors so you can jump straight back to the exact sentence in the book.",
        },
        {
          id: "shot-entity-dossier",
          category: "caseboard",
          imageFile: "entity-dossier.png",
          badge: "Character Dossier · First Appearance",
          title: "Instant Character & Evidence Dossier Drawer",
          description:
            "Tap any character or clue on the board to inspect when they first appeared and review all statements associated with them up to your current page.",
        },
        {
          id: "shot-reader-spread",
          category: "reader",
          imageFile: "reader-spread.png",
          badge: "Reader · Dual-Column Spread",
          title: "Book-Grade Dual-Column Spread Layout",
          description:
            "Crisp two-column pagination designed for tablets and wide screens, with one-tap access to the table of contents, dictionary lookup, and the live CaseBoard.",
        },
        {
          id: "shot-reader-themes",
          category: "reader",
          imageFile: "reader-themes.png",
          badge: "Reader · Eye-Care & E-Ink Presets",
          title: "Daylight, Parchment, Night & 1-Bit E-Ink Themes",
          description:
            "Fine-tune font size, line spacing, page-turn mode, and color presets—including a dedicated high-contrast E-Ink mode with zero animation ghosting.",
        },
        {
          id: "shot-reader-mint",
          category: "reader",
          imageFile: "reader-mint.png",
          badge: "Reader · Green Tea Eye-Care",
          title: "Soft Mint Eye-Care Theme for Marathon Reading",
          description:
            "Low-glare sage-green background tailored for multi-hour reading sessions through long golden-age and honkaku detective novels.",
        },
        {
          id: "shot-dictionary",
          category: "tools",
          imageFile: "dictionary-translate.png",
          badge: "Offline Dictionary · Dual-Engine Translation",
          title: "Instant Mystery Dictionary & Context-Safe Translation",
          description:
            "Built-in glossary for classic mystery terms (alibi, inquest, coroner, locked-room) plus 1ms offline lookup and spoiler-safe paragraph translation.",
        },
      ],
      showcaseTitle: "How the Spoiler-Free CaseBoard Unfolds As You Read",
      showcaseSubtitle:
        "Switch between reading progress milestones below to see how Mixu reveals new clues, highlights broken alibis, and hides unread twists.",
      step1Label: "Ch. 2 · 15% (Arrival at the Manor)",
      step2Label: "Ch. 8 · 48% (Alibi Broken)",
      step3Label: "Ch. 12 · 72% (Secret Passage Found)",
      firewallLabel: "Spoiler Guard Active",
      firewallStatus: "14 future characters & 29 twists from unread chapters are safely hidden",
      badgeObservedText: "Verified Fact",
      badgeClaimedText: "Alibi Claim",
      badgeContradictedText: "Contradiction",
      badgeLockedText: "Unread Chapter",
      node1Title: "Lin Shen (Archivist)",
      node1Role: "Ch. 1 Paragraph 4",
      node1Quote: "\"Entered the study at 21:15 carrying the brass ledger key.\"",
      node2Title: "Su Wan (Heir)",
      node2Role: "Ch. 2 Paragraph 19",
      node2Quote: "\"Claims she never left the glasshouse between 21:00 and 22:00.\"",
      node3Title: "Stopped Pocket Watch (21:38)",
      node3Role: "Ch. 8 Paragraph 11",
      node3Quote: "\"Found beneath the glasshouse grates—directly contradicts Su Wan's alibi.\"",
      node4LockedTitle: "[Hidden] Ch. 24 Cellar Truth",
      node4LockedReason: "Automatically hidden until your reading progress reaches Chapter 24",
      highlightsHeading: "Built for Mystery Readers on Every Device",
      highlightsSubtitle:
        "No complicated setup required—import your own EPUB or TXT books and start reading right away.",
      hl1Title: "Never Forget Who Is Who",
      hl1Desc:
        "Pick up a 600-page mystery after a busy week and immediately recall every suspect, relationship, and timeline detail you have read so far.",
      hl2Title: "One Tap Back to the Exact Sentence",
      hl2Desc:
        "Every testimony and clue on the CaseBoard links directly to the source paragraph, so you can verify the author's exact wording in seconds.",
      hl3Title: "Tailored for E-Ink & Tablets",
      hl3Desc:
        "First-class support for Android E-Ink readers, tablets, and phones—with crisp solid borders, instant page turns, and zero motion clutter.",
      hl4Title: "100% Offline Ready & Private",
      hl4Desc:
        "Read, annotate, use the mystery dictionary, and browse your CaseBoard completely offline without mandatory sign-ups.",
      privacyLinkText: "Privacy Policy",
      termsLinkText: "Terms of Service",
      contactLabel: "Contact: support@mixuread.com",
      icpNote: "mixuread.com · Mixu Mystery Reader",
    };
  }

  if (locale === "ja") {
    return {
      navGallery: "画面スクリーンショット",
      navShowcase: "捜査ボード実演",
      navFeatures: "3つの価値",
      navDownload: "v0.0.1 ダウンロード",
      einkToggleLabel: "E-Ink モード",
      releaseBadge: "v0.0.1 Alpha · Android APK 公開中",
      quickDownloadText: "v0.0.1 APK をダウンロード（署名検証済）→",
      heroArtCaption: "長編ミステリーの読書机：物語を読み進めながら、隣で捜査ボードを広げる",
      heroPreviewCaption: "実機画面：2D 捜査ボードと読書進度連動スライダー",
      valArt1Label: "01 · 読んだ章だけを表示（ネタバレ防止）",
      valArt2Label: "02 · ワンタップで原文の行へ戻る",
      valArt3Label: "03 · ログイン不要・E-Ink 端末対応",
      galleryTitle: "アプリ画面ギャラリー・主要機能一覧",
      gallerySubtitle:
        "登場人物の整理、証言とアリバイの照合、ミステリー用語辞典、2段組レイアウトや電子ペーパー表示まで、実際のアプリ画面でご紹介します。",
      filterAll: "すべての機能 (8)",
      filterCaseboard: "捜査ボード・証拠管理 (4)",
      filterReader: "読書画面・テーマ (3)",
      filterTools: "オフライン辞典・翻訳 (1)",
      zoomHint: "クリックして拡大表示",
      lightboxCloseLabel: "プレビューを閉じる",
      screenshots: [
        {
          id: "shot-caseboard-2d",
          category: "caseboard",
          imageFile: "caseboard-2d.png",
          badge: "捜査ボード · 2D 相関図",
          title: "読書進度に合わせて広がる 2D 人物・証拠相関図",
          description:
            "読了した章までの人物・場所・証拠品を自動で整理。ノードを自由にドラッグでき、上部のスライダーで過去の章の状況をネタバレなしで振り返れます。",
        },
        {
          id: "shot-caseboard-hierarchy",
          category: "caseboard",
          imageFile: "caseboard-hierarchy.png",
          badge: "捜査ボード · 階層トポロジー",
          title: "ワンタップで階層構造ビューに切り替え",
          description:
            "複雑な家系図や館の住人関係、組織の上下関係をワンタップで階層レイアウトに整列し、人間関係を一目で把握できます。",
        },
        {
          id: "shot-caseboard-claims",
          category: "caseboard",
          imageFile: "caseboard-claims.png",
          badge: "証言一覧 · 原文ジャンプ",
          title: "証言・証拠リストと原文段落へのダイレクトジャンプ",
          description:
            "登場人物の証言や目撃情報を一覧化。各項目には原文の位置が記録されており、いつでも小説の該当段落へ戻って確認できます。",
        },
        {
          id: "shot-entity-dossier",
          category: "caseboard",
          imageFile: "entity-dossier.png",
          badge: "人物ファイル · 初出追跡",
          title: "人物・証拠品の個別ファイルカード",
          description:
            "相関図上の人物や証拠品をタップすると、初登場の章やこれまでの関連証言をまとめた詳細カードがその場で開きます。",
        },
        {
          id: "shot-reader-spread",
          category: "reader",
          imageFile: "reader-spread.png",
          badge: "リーダー · 見開き2段組",
          title: "紙の本のように読みやすい見開き2段組レイアウト",
          description:
            "タブレットや横画面に最適な2段組ページ表示。画面下部から目次・辞書検索・捜査ボードをワンタップで呼び出せます。",
        },
        {
          id: "shot-reader-themes",
          category: "reader",
          imageFile: "reader-themes.png",
          badge: "リーダー · 読書テーマと E-Ink",
          title: "昼間・羊皮紙・夜間・E-Ink 電子ペーパーの4大プリセット",
          description:
            "文字サイズや行間、ページめくり方式を細かく調整可能。E-Ink 端末向けに残像を抑えた高コントラスト白黒表示も搭載しています。",
        },
        {
          id: "shot-reader-mint",
          category: "reader",
          imageFile: "reader-mint.png",
          badge: "リーダー · アイケア配色",
          title: "長編ミステリーの長時間読書に優しいアイケアテーマ",
          description:
            "目の疲れを軽減する落ち着いたグリーン背景で、大作本格ミステリーも快適に読み進められます。",
        },
        {
          id: "shot-dictionary",
          category: "tools",
          imageFile: "dictionary-translate.png",
          badge: "オフライン辞典 · 翻訳ツール",
          title: "ミステリー用語辞典の即時検索とネタバレ防止翻訳",
          description:
            "アリバイ、検死審問、密室などの本格ミステリー頻出用語を解説付きで収録。オフライン高速辞書と文脈翻訳をその場で利用できます。",
        },
      ],
      showcaseTitle: "読書進度に合わせた捜査ボードの変化（操作デモ）",
      showcaseSubtitle:
        "下の読書進度ボタンを切り替えると、物語の進行に合わせて新しい手がかりが解放され、未読の章がどのように伏せられるかを体験できます。",
      step1Label: "第2章 · 15%（館への到着）",
      step2Label: "第8章 · 48%（アリバイの矛盾）",
      step3Label: "第12章 · 72%（時計塔の隠し通路）",
      firewallLabel: "ネタバレ防止ロック有効",
      firewallStatus: "まだ読んでいない後半の章の14件の人物・29件の真相を自動で伏せています",
      badgeObservedText: "確認済の事実",
      badgeClaimedText: "本人の証言",
      badgeContradictedText: "アリバイ矛盾",
      badgeLockedText: "未読の章",
      node1Title: "リン・シェン（記録係）",
      node1Role: "第1章 第4段落",
      node1Quote: "「21時15分、真鍮の鍵を持って書斎へ入った。」",
      node2Title: "スー・ワン（相続人）",
      node2Role: "第2章 第19段落",
      node2Quote: "「21時から22時の間、温室から一歩も出ていないと主張。」",
      node3Title: "止まった懐中時計 (21:38)",
      node3Role: "第8章 第11段落",
      node3Quote: "「温室の格子下で発見。スー・ワンの不在証明と矛盾する。」",
      node4LockedTitle: "[未解放] 第24章 地下室の真相",
      node4LockedReason: "第24章まで読み進めるまで、この手がかりは表示されません",
      highlightsHeading: "ミステリー読者のための心地よい読書体験",
      highlightsSubtitle:
        "手持ちの EPUB / TXT 書籍を読み込むだけで、すぐに捜査ボード付きの読書を始められます。",
      hl1Title: "日数が空いても「この人は誰？」とならない",
      hl1Desc:
        "登場人物が多い長編や館シリーズでも、現在のページまでに登場した人物と関係性をいつでも振り返れます。",
      hl2Title: "証拠カードから原文の行へワンタップで往復",
      hl2Desc:
        "すべての証言と手がかりに原文の位置が紐づいており、伏線の表現を確かめてから元のページへすぐ戻れます。",
      hl3Title: "E-Ink 電子ペーパー端末とタブレットに最適化",
      hl3Desc:
        "アニメーションを排したくっきりとした線画表示と2段組レイアウトで、電子ペーパー端末でも紙の本のように快適です。",
      hl4Title: "登録不要・完全オフラインでも利用可能",
      hl4Desc:
        "アカウント登録なしで書籍のインポート、読書、しおり、オフライン辞典、捜査ボードの閲覧がすべて端末内で完結します。",
      privacyLinkText: "プライバシーポリシー",
      termsLinkText: "利用規約",
      contactLabel: "お問い合わせ: support@mixuread.com",
      icpNote: "mixuread.com · Mixu ミステリー読書アプリ",
    };
  }

  return {
    navGallery: "功能截图",
    navShowcase: "案情板体验",
    navFeatures: "核心价值",
    navDownload: "下载 v0.0.1",
    einkToggleLabel: "E-Ink 墨水屏模式",
    releaseBadge: "v0.0.1 Alpha · Android 官方安装包已发布",
    quickDownloadText: "下载 v0.0.1 客户端 APK（附安装校验说明）→",
    heroArtCaption: "推理读者的书桌伴侣：一边展卷阅读，一边在平板或墨水屏上梳理线索网",
    heroPreviewCaption: "应用实拍：按阅读进度展开的 2D 案情图板与不剧透历史复盘滑块",
    valArt1Label: "01 · 书签级防剧透屏障（只显示已读章节）",
    valArt2Label: "02 · 案情板红线直连原文段落",
    valArt3Label: "03 · 离线即用 · 墨水屏与平板静心伴读",
    galleryTitle: "产品界面实拍 · 核心功能一览",
    gallerySubtitle:
      "从自动梳理人物关系的 2D 案情图板、一键回跳原文的证言核对表，到双栏精排、护眼主题与离线推理词典——点击下方任意截图可放大查看高清细节。",
    filterAll: "全部功能截图 (8)",
    filterCaseboard: "案情图板与线索核对 (4)",
    filterReader: "双栏精排与护眼主题 (3)",
    filterTools: "离线推理词典与秒译 (1)",
    zoomHint: "点击放大查看高清截图",
    lightboxCloseLabel: "关闭大图预览",
    screenshots: [
      {
        id: "shot-caseboard-2d",
        category: "caseboard",
        imageFile: "caseboard-2d.png",
        badge: "案情图板 · 2D 关系网",
        title: "随阅读进度展开的 2D 人物与证物关系板",
        description:
          "自动汇总你已读章节中的登场人物、案发地点与关键证物。支持自由拖拽节点排布，拖动顶部「历史叙事复盘」滑块即可回看前几章的线索演变，绝不泄露未读剧情。",
      },
      {
        id: "shot-caseboard-hierarchy",
        category: "caseboard",
        imageFile: "caseboard-hierarchy.png",
        badge: "案情图板 · 层级拓扑",
        title: "一键切换「层级拓扑」理清复杂家族与阵营",
        description:
          "面对动辄二三十位登场人物的古典大家族或暴风雪山庄长篇，一键从网状视图切换为上下层级拓扑，阵营归属与核心证物脉络一目了然。",
      },
      {
        id: "shot-caseboard-claims",
        category: "caseboard",
        imageFile: "caseboard-claims.png",
        badge: "证言核对 · 原文锚点",
        title: "各执一词的证言列表与一键回跳原文",
        description:
          "将已读章节中的现场勘验事实与嫌疑人证词集中归档。每条记录均带有原文段落定位，点击即可瞬间跳回小说原句核对伏笔细节。",
      },
      {
        id: "shot-entity-dossier",
        category: "caseboard",
        imageFile: "entity-dossier.png",
        badge: "人物档案 · 登场追踪",
        title: "点按节点即开的人物与证物专属档案卡",
        description:
          "隔了几天继续读忘了“这人是谁”？在案情板上轻点人物头像，立即弹出该角色首次登场章节及截至当前页名下的所有陈述与关联线索。",
      },
      {
        id: "shot-reader-spread",
        category: "reader",
        imageFile: "reader-spread.png",
        badge: "双栏精排 · 纸书体验",
        title: "媲美实体精装书的双栏分页阅读体验",
        description:
          "专为大屏手机、平板与横屏阅读打造的双栏精排视图，底部状态栏实时显示章节页码与总进度，并可随时一键呼出目录、查词翻译与案情图板。",
      },
      {
        id: "shot-reader-themes",
        category: "reader",
        imageFile: "reader-themes.png",
        badge: "护眼预设 · 墨水屏适配",
        title: "白昼、羊皮纸、深色夜间与墨水屏黑白高对比",
        description:
          "内置多套精调阅读主题，支持精准分页与平滑滚动自由切换、首行缩进与字号行距微调，针对 E-Ink 电纸书提供零残影纯黑白高对比模式。",
      },
      {
        id: "shot-reader-mint",
        category: "reader",
        imageFile: "reader-mint.png",
        badge: "青茗护眼 · 长篇久读",
        title: "柔和「青茗护眼」主题，长篇连读不累眼",
        description:
          "针对数十万字的大部头本格推理与社会派长篇特别调校的低眩光青茗绿底色，深夜或长途旅途中连续阅读数小时依然舒适清晰。",
      },
      {
        id: "shot-dictionary",
        category: "tools",
        imageFile: "dictionary-translate.png",
        badge: "推理词典 · 双引擎秒译",
        title: "内置推理专有名词词典与毫秒级离线段落翻译",
        description:
          "阅读原版或古典推理时遇到生僻词？内置不在场证明 (Alibi)、死因审讯 (Inquest)、巴比妥 (Veronal)、密室等推理核心术语详解，支持离线秒查与不剧透段落精译。",
      },
    ],
    showcaseTitle: "三步交互体验：案情板如何随阅读进度防剧透展开",
    showcaseSubtitle:
      "点击下方不同章节进度按钮，直观感受当你从第 2 章读到第 12 章时，案情板如何一步步解锁新线索、标出不在场证明矛盾，并锁止后续章节真相。",
    step1Label: "读到第 2 章 · 15%（初抵雾庄）",
    step2Label: "读到第 8 章 · 48%（不在场证明破裂）",
    step3Label: "读到第 12 章 · 72%（钟楼密道浮现）",
    firewallLabel: "防剧透阅读保护已开启",
    firewallStatus: "已自动隐藏第 12 章之后的 14 位未登场人物与 29 条后续反转线索",
    badgeObservedText: "已确认线索",
    badgeClaimedText: "嫌疑人证言",
    badgeContradictedText: "证言出现矛盾",
    badgeLockedText: "未读章节已锁止",
    node1Title: "林深（档案管理员）",
    node1Role: "第 1 章 第 4 段",
    node1Quote: "“21:15 持黄铜账本钥匙进入书房，袖口沾有冷杉树脂。”",
    node2Title: "苏晚（庄园继承人）",
    node2Role: "第 2 章 第 19 段",
    node2Quote: "“自称 21:00 至 22:00 一直在玻璃花房修剪白山茶，未曾离开。”",
    node3Title: "停摆的怀表 (21:38)",
    node3Role: "第 8 章 第 11 段",
    node3Quote: "“在花房排水格栅下寻获，表壳刻痕与苏晚的不在场证明直接矛盾。”",
    node4LockedTitle: "[未读锁止] 第 24 章 地下酒窖真相",
    node4LockedReason: "该线索位于第 24 章，在你读到对应章节前会自动锁止隐藏，彻底杜绝剧透",
    highlightsHeading: "为长篇悬疑推理读者量身打造的伴读体验",
    highlightsSubtitle:
      "导入本地 EPUB 或 TXT 图书即可直接开读，把繁琐的人物关系与时间线记忆交给谜序，把解谜的乐趣留给自己。",
    hl1Title: "人物再多、隔周再读也不怕忘",
    hl1Desc:
      "读欧美黄金时代古典、日系新本格或长篇历史公案时，随时打开案情板查看已登场人物名册与关系线，一秒接上阅读记忆。",
    hl2Title: "每条证言都能一键跳回原文原句",
    hl2Desc:
      "想核对某句证词是不是叙述性诡计？点击案情板上的线索卡片即可直接跳回小说对应段落，核对完毕再一键回到当前阅读页。",
    hl3Title: "手机、平板与 E-Ink 墨水屏全适配",
    hl3Desc:
      "同一个安装包自适应手机竖屏、平板双栏与电纸书墨水屏，支持一键开启无残影纯黑白高对比模式，安静专注读完一本书。",
    hl4Title: "免登录离线即用，阅读笔记留在本地",
    hl4Desc:
      "不强制注册登录，书籍导入、分页阅读、书签笔记、离线词典与本地案情图板全部可在离线环境下完整运行。",
    privacyLinkText: "隐私政策",
    termsLinkText: "服务条款",
    contactLabel: "联系邮箱：support@mixuread.com",
    icpNote: "mixuread.com · 谜序 Mixu 悬疑推理伴读阅读器",
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

  const galleryCardsHtml = copy.screenshots
    .map(
      (shot) => `
          <article class="screenshot-card" data-shot-category="${shot.category}">
            <button
              type="button"
              class="screenshot-Preview-trigger"
              data-lightbox-src="${assetPrefix}/screenshots/${shot.imageFile}"
              data-lightbox-title="${escapeHtml(shot.title)}"
              data-lightbox-desc="${escapeHtml(shot.description)}"
              aria-label="${escapeHtml(shot.title)} — ${escapeHtml(copy.zoomHint)}"
            >
              <div class="screenshot-frame">
                <img
                  src="${assetPrefix}/screenshots/${shot.imageFile}"
                  alt="${escapeHtml(shot.title)}"
                  width="1280"
                  height="700"
                  loading="lazy"
                />
                <span class="screenshot-zoom-pill">${escapeHtml(copy.zoomHint)}</span>
              </div>
            </button>
            <div class="screenshot-body">
              <span class="screenshot-badge">${escapeHtml(shot.badge)}</span>
              <h3>${escapeHtml(shot.title)}</h3>
              <p>${escapeHtml(shot.description)}</p>
            </div>
          </article>`
    )
    .join("\n");

  return `
      <div class="site-topbar">
        <a class="brand-lockup" href="./index.html">
          <img class="mark" src="${assetPrefix}/logo-mark.svg" alt="${escapeHtml(locCfg.siteName)}" width="40" height="40" />
          <span class="brand-name">${escapeHtml(locCfg.siteName)}</span>
        </a>
        <div class="topbar-actions">
          <nav class="topbar-nav" aria-label="Primary">
            <a href="#gallery">${escapeHtml(copy.navGallery)}</a>
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
        <div class="hero-main-preview hero-dual-showcase">
          <div class="hero-showcase-col">
            <button
              type="button"
              class="hero-preview-btn"
              data-lightbox-src="${assetPrefix}/screenshots/hero-mystery-desk.jpg"
              data-lightbox-title="${escapeHtml(copy.heroArtCaption)}"
              data-lightbox-desc="${escapeHtml(data.headline)}"
            >
              <img
                src="${assetPrefix}/screenshots/hero-mystery-desk.jpg"
                alt="${escapeHtml(copy.heroArtCaption)}"
                width="1280"
                height="714"
              />
            </button>
            <p class="hero-preview-caption">${escapeHtml(copy.heroArtCaption)}</p>
          </div>
          <div class="hero-showcase-col">
            <button
              type="button"
              class="hero-preview-btn"
              data-lightbox-src="${assetPrefix}/screenshots/caseboard-2d.png"
              data-lightbox-title="${escapeHtml(copy.screenshots[0]?.title ?? "")}"
              data-lightbox-desc="${escapeHtml(copy.screenshots[0]?.description ?? "")}"
            >
              <img
                src="${assetPrefix}/screenshots/caseboard-2d.png"
                alt="${escapeHtml(copy.heroPreviewCaption)}"
                width="1280"
                height="691"
              />
            </button>
            <p class="hero-preview-caption">${escapeHtml(copy.heroPreviewCaption)}</p>
          </div>
        </div>
      </header>

      <section id="gallery" class="section gallery-section">
        <div class="showcase-header">
          <h2>${escapeHtml(copy.galleryTitle)}</h2>
          <p class="showcase-sub">${escapeHtml(copy.gallerySubtitle)}</p>
        </div>

        <div class="gallery-filters" role="tablist" aria-label="${escapeHtml(copy.galleryTitle)}">
          <button type="button" class="gallery-filter-btn active" data-gallery-filter="all" role="tab" aria-selected="true">
            ${escapeHtml(copy.filterAll)}
          </button>
          <button type="button" class="gallery-filter-btn" data-gallery-filter="caseboard" role="tab" aria-selected="false">
            ${escapeHtml(copy.filterCaseboard)}
          </button>
          <button type="button" class="gallery-filter-btn" data-gallery-filter="reader" role="tab" aria-selected="false">
            ${escapeHtml(copy.filterReader)}
          </button>
          <button type="button" class="gallery-filter-btn" data-gallery-filter="tools" role="tab" aria-selected="false">
            ${escapeHtml(copy.filterTools)}
          </button>
        </div>

        <div class="screenshot-grid" id="screenshot-grid">
          ${galleryCardsHtml}
        </div>
      </section>

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
                <span class="epistemic-badge badge-observed">${escapeHtml(copy.badgeObservedText)}</span>
                <span class="clue-locus">${escapeHtml(copy.node1Role)}</span>
              </div>
              <h3>${escapeHtml(copy.node1Title)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node1Quote)}</p>
            </article>

            <article class="clue-node status-claimed" data-min-step="0">
              <div class="clue-node-header">
                <span class="epistemic-badge badge-claimed">${escapeHtml(copy.badgeClaimedText)}</span>
                <span class="clue-locus">${escapeHtml(copy.node2Role)}</span>
              </div>
              <h3>${escapeHtml(copy.node2Title)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node2Quote)}</p>
            </article>

            <article class="clue-node status-contradicted" data-min-step="1">
              <div class="clue-node-header">
                <span class="epistemic-badge badge-contradicted">${escapeHtml(copy.badgeContradictedText)}</span>
                <span class="clue-locus">${escapeHtml(copy.node3Role)}</span>
              </div>
              <h3>${escapeHtml(copy.node3Title)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node3Quote)}</p>
            </article>

            <article class="clue-node status-locked" data-min-step="99" aria-disabled="true">
              <div class="clue-node-header">
                <span class="epistemic-badge badge-locked">${escapeHtml(copy.badgeLockedText)}</span>
                <span class="clue-locus">Ch. 24</span>
              </div>
              <h3>${escapeHtml(copy.node4LockedTitle)}</h3>
              <p class="clue-quote">${escapeHtml(copy.node4LockedReason)}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="demo" class="section values">
        <h2>${valuesHeading}</h2>
        <div class="values-visual-trio">
          <figure class="bookplate-card">
            <button
              type="button"
              class="bookplate-img-btn"
              data-lightbox-src="${assetPrefix}/screenshots/illus-spoiler-shield.jpg"
              data-lightbox-title="${escapeHtml(copy.valArt1Label)}"
              data-lightbox-desc="${escapeHtml(copy.firewallStatus)}"
            >
              <img
                src="${assetPrefix}/screenshots/illus-spoiler-shield.jpg"
                alt="${escapeHtml(copy.valArt1Label)}"
                width="800"
                height="597"
                loading="lazy"
              />
            </button>
            <figcaption>${escapeHtml(copy.valArt1Label)}</figcaption>
          </figure>
          <figure class="bookplate-card">
            <button
              type="button"
              class="bookplate-img-btn"
              data-lightbox-src="${assetPrefix}/screenshots/illus-caseboard-threads.jpg"
              data-lightbox-title="${escapeHtml(copy.valArt2Label)}"
              data-lightbox-desc="${escapeHtml(copy.hl2Desc)}"
            >
              <img
                src="${assetPrefix}/screenshots/illus-caseboard-threads.jpg"
                alt="${escapeHtml(copy.valArt2Label)}"
                width="800"
                height="597"
                loading="lazy"
              />
            </button>
            <figcaption>${escapeHtml(copy.valArt2Label)}</figcaption>
          </figure>
          <figure class="bookplate-card">
            <button
              type="button"
              class="bookplate-img-btn"
              data-lightbox-src="${assetPrefix}/screenshots/illus-eink-reading.jpg"
              data-lightbox-title="${escapeHtml(copy.valArt3Label)}"
              data-lightbox-desc="${escapeHtml(copy.hl3Desc)}"
            >
              <img
                src="${assetPrefix}/screenshots/illus-eink-reading.jpg"
                alt="${escapeHtml(copy.valArt3Label)}"
                width="800"
                height="597"
                loading="lazy"
              />
            </button>
            <figcaption>${escapeHtml(copy.valArt3Label)}</figcaption>
          </figure>
        </div>
        ${data.valuesHtml}
      </section>

      <section class="section highlights-section">
        <h2>${escapeHtml(copy.highlightsHeading)}</h2>
        <p class="showcase-sub">${escapeHtml(copy.highlightsSubtitle)}</p>
        <div class="arch-grid">
          <div class="arch-card">
            <div class="arch-card-top">
              <strong>${escapeHtml(copy.hl1Title)}</strong>
            </div>
            <p>${escapeHtml(copy.hl1Desc)}</p>
          </div>
          <div class="arch-card">
            <div class="arch-card-top">
              <strong>${escapeHtml(copy.hl2Title)}</strong>
            </div>
            <p>${escapeHtml(copy.hl2Desc)}</p>
          </div>
          <div class="arch-card">
            <div class="arch-card-top">
              <strong>${escapeHtml(copy.hl3Title)}</strong>
            </div>
            <p>${escapeHtml(copy.hl3Desc)}</p>
          </div>
          <div class="arch-card">
            <div class="arch-card-top">
              <strong>${escapeHtml(copy.hl4Title)}</strong>
            </div>
            <p>${escapeHtml(copy.hl4Desc)}</p>
          </div>
        </div>
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

      <div id="screenshot-lightbox" class="screenshot-lightbox" hidden aria-modal="true" role="dialog">
        <div class="lightbox-backdrop" data-lightbox-close="true"></div>
        <div class="lightbox-dialog">
          <button type="button" class="lightbox-close-btn" data-lightbox-close="true" aria-label="${escapeHtml(copy.lightboxCloseLabel)}">×</button>
          <img id="lightbox-img" src="${assetPrefix}/screenshots/caseboard-2d.png" alt="" />
          <div class="lightbox-caption">
            <strong id="lightbox-title"></strong>
            <p id="lightbox-desc"></p>
          </div>
        </div>
      </div>

      <footer class="footer-disclaimers note">
        ${data.disclaimersHtml}
        <div class="footer-meta-links">
          <span>${escapeHtml(copy.icpNote)}</span>
          <span class="footer-sep">·</span>
          <a href="mailto:support@mixuread.com">${escapeHtml(copy.contactLabel)}</a>
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
