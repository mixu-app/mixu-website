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
        href: isPrimary ? "#showcase" : "https://github.com/mixu-app/mixu-client",
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

interface HeroQuickTab {
  id: string;
  label: string;
  imageFile: string;
  caption: string;
}

interface MoreFeatureItem {
  title: string;
  desc: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface LocalizedLandingCopy {
  navGallery: string;
  navShowcase: string;
  navFeatures: string;
  navFaq: string;
  navDownload: string;
  einkToggleLabel: string;
  releaseBadge: string;
  rotatePrefix: string;
  rotateWords: string[];
  downloadNowBtn: string;
  githubStarNote: string;
  heroQuickTabs: HeroQuickTab[];
  pillarsSubtitle: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
  pillar3Title: string;
  pillar3Desc: string;
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
  moreFeaturesHeading: string;
  moreFeaturesSubtitle: string;
  moreFeatures: MoreFeatureItem[];
  mobileSectionTitle: string;
  mobileSectionDesc: string;
  mobileSectionCta: string;
  faqHeading: string;
  faqs: FaqItem[];
  faqMoreTitle: string;
  faqMoreSub: string;
  copyBtnText: string;
  copiedBtnText: string;
  footerCtaTitle: string;
  footerCtaSub: string;
  privacyLinkText: string;
  termsLinkText: string;
  contactLabel: string;
  icpNote: string;
}

function getLandingCopy(locale: string): LocalizedLandingCopy {
  if (locale === "en") {
    return {
      navGallery: "Features",
      navShowcase: "Interactive Demo",
      navFeatures: "Why Mixu",
      navFaq: "FAQ",
      navDownload: "Download v0.0.1",
      einkToggleLabel: "E-Ink Mode",
      releaseBadge: "v0.0.1 Alpha · Android & E-Ink APK Available",
      rotatePrefix: "With",
      rotateWords: [
        "Spoiler-Free Lock",
        "2D CaseBoard",
        "One-Tap Source Jump",
        "1-Bit E-Ink Mode",
        "Mystery Glossary",
      ],
      downloadNowBtn: "Download Now",
      githubStarNote: "Open-core on GitHub — Star us to support spoiler-free reading",
      heroQuickTabs: [
        {
          id: "tab-caseboard",
          label: "2D CaseBoard",
          imageFile: "caseboard-2d.png",
          caption: "Live 2D suspect & clue board with reading-progress rewind slider",
        },
        {
          id: "tab-reader",
          label: "Dual-Column Reader",
          imageFile: "reader-spread.png",
          caption: "Book-grade dual-column spread pagination for tablets & wide screens",
        },
        {
          id: "tab-claims",
          label: "Alibi & Testimony Check",
          imageFile: "caseboard-claims.png",
          caption: "Every witness testimony links directly back to the source sentence",
        },
        {
          id: "tab-dict",
          label: "Mystery Dictionary",
          imageFile: "dictionary-translate.png",
          caption: "Offline mystery terminology lookup and dual-engine paragraph translation",
        },
        {
          id: "tab-desk",
          label: "Detective Study",
          imageFile: "hero-mystery-desk.jpg",
          caption: "Read on paper or E-Ink while keeping every suspect and alibi organized",
        },
      ],
      pillarsSubtitle: "An Upgraded Reading Experience for Long-Form Mystery",
      pillar1Title: "Spoiler-Free Progress Lock",
      pillar1Desc:
        "Your CaseBoard strictly mirrors your current reading position. Read up to Chapter 10 and twists from Chapter 14 stay completely invisible.",
      pillar2Title: "One-Tap Source Jump",
      pillar2Desc:
        "Every character profile, alibi, and piece of evidence links back to the exact sentence in the book—verify clues and return in one tap.",
      pillar3Title: "Offline-First & E-Ink Ready",
      pillar3Desc:
        "Import EPUB/TXT books, annotate, look up terms, and explore your CaseBoard 100% offline across phones, tablets, and E-Ink readers.",
      valArt1Label: "01 · Spoiler-Free Reading Horizon",
      valArt2Label: "02 · One-Tap Jump to Source Sentence",
      valArt3Label: "03 · Offline-First & E-Ink Ready",
      galleryTitle: "Our Features",
      gallerySubtitle:
        "Explore real app screenshots in framed views—click any window below to inspect full-resolution details.",
      filterAll: "All Screenshots (8)",
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
          badge: "CaseBoard · 2D Map",
          title: "Interactive 2D Suspect & Clue Relationship Board",
          description:
            "Automatically organizes characters, locations, and key evidence from chapters you have already read. Drag nodes freely and rewind the top progress slider spoiler-free.",
        },
        {
          id: "shot-caseboard-hierarchy",
          category: "caseboard",
          imageFile: "caseboard-hierarchy.png",
          badge: "CaseBoard · Hierarchy",
          title: "One-Tap Hierarchical Topology View",
          description:
            "Switch instantly from a force-directed web to a structured top-down hierarchy—ideal for untangling sprawling family trees and manor households.",
        },
        {
          id: "shot-caseboard-claims",
          category: "caseboard",
          imageFile: "caseboard-claims.png",
          badge: "Testimonies · Source Jump",
          title: "Testimony & Evidence Checklist with Paragraph Links",
          description:
            "Lists every observed fact and witness statement unlocked so far, complete with chapter anchors so you can jump straight back to the exact sentence.",
        },
        {
          id: "shot-entity-dossier",
          category: "caseboard",
          imageFile: "entity-dossier.png",
          badge: "Character Dossier",
          title: "Instant Character & Evidence Dossier Drawer",
          description:
            "Tap any character or clue on the board to inspect when they first appeared and review all statements associated with them up to your current page.",
        },
        {
          id: "shot-reader-spread",
          category: "reader",
          imageFile: "reader-spread.png",
          badge: "Reader · Dual-Column",
          title: "Book-Grade Dual-Column Spread Layout",
          description:
            "Crisp two-column pagination designed for tablets and wide screens, with one-tap access to the table of contents, dictionary lookup, and the live CaseBoard.",
        },
        {
          id: "shot-reader-themes",
          category: "reader",
          imageFile: "reader-themes.png",
          badge: "Reader · Eye-Care & E-Ink",
          title: "Daylight, Parchment, Night & 1-Bit E-Ink Themes",
          description:
            "Fine-tune font size, line spacing, page-turn mode, and color presets—including a dedicated high-contrast E-Ink mode with zero animation ghosting.",
        },
        {
          id: "shot-reader-mint",
          category: "reader",
          imageFile: "reader-mint.png",
          badge: "Reader · Green Tea Theme",
          title: "Soft Mint Eye-Care Theme for Marathon Reading",
          description:
            "Low-glare sage-green background tailored for multi-hour reading sessions through long golden-age and honkaku detective novels.",
        },
        {
          id: "shot-dictionary",
          category: "tools",
          imageFile: "dictionary-translate.png",
          badge: "Offline Dictionary",
          title: "Instant Mystery Dictionary & Context-Safe Translation",
          description:
            "Built-in glossary for classic mystery terms (alibi, inquest, coroner, locked-room) plus 1ms offline lookup and spoiler-safe paragraph translation.",
        },
      ],
      showcaseTitle: "Interactive Demo: How the CaseBoard Unfolds As You Read",
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
      moreFeaturesHeading: "More Features",
      moreFeaturesSubtitle:
        "Designed specifically for readers of classic whodunits, locked-room mysteries, and sprawling historical detective fiction.",
      moreFeatures: [
        {
          title: "Flexible Single & Dual-Column Layouts",
          desc: "Switch effortlessly between single-column phone mode, two-column tablet book spreads, and continuous scrolling.",
        },
        {
          title: "Historical Timeline Rewind Slider",
          desc: "Drag the progress slider backward to see what the suspect network looked like three chapters ago without losing your current bookmark.",
        },
        {
          title: "Contradiction & Alibi Highlighting",
          desc: "Compare witness testimonies side by side with physical clues and jump directly to the source paragraph to verify every word.",
        },
        {
          title: "Full Typography Customization",
          desc: "Adjust font family, font size, line height, paragraph spacing, and first-line indentation to create your ideal reading page.",
        },
        {
          title: "Night, Parchment & E-Ink Modes",
          desc: "Switch to warm parchment, soft mint, deep night mode, or 1-bit E-Ink high-contrast mode for zero-glare reading day or night.",
        },
        {
          title: "Offline Mystery Glossary & Notes",
          desc: "Look up classic detective terminology offline in 1ms and keep personal deduction notes anchored to specific characters and chapters.",
        },
      ],
      mobileSectionTitle: "Download for Android, Tablets & E-Ink",
      mobileSectionDesc:
        "Enjoy distraction-free mystery reading and a live spoiler-safe CaseBoard on your phone, tablet, or Android E-Ink reader—completely offline-capable from the first page.",
      mobileSectionCta: "Download the App (v0.0.1 APK) →",
      faqHeading: "Frequently Asked Questions",
      faqs: [
        {
          question: "How does Mixu guarantee I won't see spoilers from later chapters?",
          answer:
            "Every character, relationship, and testimony in a Graph Pack is tagged with the exact chapter and paragraph where it first appears. Mixu filters out everything beyond your current reading position before rendering the CaseBoard.",
        },
        {
          question: "Can I use Mixu completely offline without creating an account?",
          answer:
            "Yes. Importing EPUB/TXT books, paginated reading, themes, bookmarks, the offline mystery dictionary, and local CaseBoard packs all work 100% offline with no login required.",
        },
        {
          question: "Does it work well on Onyx Boox, iReader, and other Android E-Ink devices?",
          answer:
            "Yes. Mixu includes a dedicated E-Ink mode that disables spring animations, removes gradients, and uses crisp 1-bit solid borders to eliminate screen ghosting.",
        },
        {
          question: "How can I verify the downloaded APK is authentic?",
          answer:
            "Our download page provides the official SHA-256 checksum and apksigner certificate fingerprint so you can verify package integrity before installing.",
        },
      ],
      faqMoreTitle: "Still have questions?",
      faqMoreSub: "Feel free to reach out to us by email anytime:",
      copyBtnText: "Copy",
      copiedBtnText: "Copied ✓",
      footerCtaTitle: "Start Reading Spoiler-Free",
      footerCtaSub: "Ready to keep every suspect, alibi, and clue organized as you read?",
      privacyLinkText: "Privacy Policy",
      termsLinkText: "Terms of Service",
      contactLabel: "Contact: support@mixuread.com",
      icpNote: "mixuread.com · Mixu Mystery Reader",
    };
  }

  if (locale === "ja") {
    return {
      navGallery: "機能一覧",
      navShowcase: "捜査ボード実演",
      navFeatures: "3つの価値",
      navFaq: "よくある質問",
      navDownload: "v0.0.1 ダウンロード",
      einkToggleLabel: "E-Ink モード",
      releaseBadge: "v0.0.1 Alpha · Android / E-Ink 対応 APK 公開中",
      rotatePrefix: "対応：",
      rotateWords: [
        "ネタバレ防止ロック",
        "2D 捜査ボード",
        "原文ワンタップ移動",
        "E-Ink 高コントラスト",
        "ミステリー用語辞典",
      ],
      downloadNowBtn: "今すぐダウンロード",
      githubStarNote: "Mixu はオープンコアプロジェクトです。GitHub での Star をお待ちしています",
      heroQuickTabs: [
        {
          id: "tab-caseboard",
          label: "2D 捜査ボード",
          imageFile: "caseboard-2d.png",
          caption: "読書進度に合わせて広がる 2D 相関図と振り返りスライダー",
        },
        {
          id: "tab-reader",
          label: "見開き2段組リーダー",
          imageFile: "reader-spread.png",
          caption: "タブレットや大画面で紙の本のように読める見開き2段組レイアウト",
        },
        {
          id: "tab-claims",
          label: "証言・アリバイ照合",
          imageFile: "caseboard-claims.png",
          caption: "すべての証言と証拠カードから小説の該当段落へワンタップでジャンプ",
        },
        {
          id: "tab-dict",
          label: "ミステリー辞典・翻訳",
          imageFile: "dictionary-translate.png",
          caption: "本格ミステリー用語のオフライン即時検索と段落翻訳",
        },
        {
          id: "tab-desk",
          label: "ミステリー読書机",
          imageFile: "hero-mystery-desk.jpg",
          caption: "物語を読み進めながら、隣で手がかりと人物関係を整理",
        },
      ],
      pillarsSubtitle: "長編ミステリー読書を全面的にアップグレード",
      pillar1Title: "読んだ章だけを表示",
      pillar1Desc:
        "捜査ボードは現在の読書位置と連動。第10章まで読んでいる時は、第14章で明かされる真相や人物関係は一切表示されません。",
      pillar2Title: "ワンタップで原文の行へ",
      pillar2Desc:
        "すべての人物カードや証言には原文の段落位置が記録されており、いつでも伏線の表現を確かめてから元のページへ戻れます。",
      pillar3Title: "完全オフライン＆ E-Ink 対応",
      pillar3Desc:
        "アカウント登録不要。EPUB/TXT のインポート、しおり、オフライン辞典、E-Ink 電子ペーパー向け白黒表示が端末内で完結します。",
      valArt1Label: "01 · 読んだ章だけを表示（ネタバレ防止）",
      valArt2Label: "02 · ワンタップで原文の行へ戻る",
      valArt3Label: "03 · ログイン不要・E-Ink 端末対応",
      galleryTitle: "主な機能",
      gallerySubtitle:
        "実際のアプリ画面で Mixu の機能をご紹介します。任意のカードをクリックすると高解像度で拡大表示できます。",
      filterAll: "すべての機能画面 (8)",
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
          badge: "捜査ボード · 階層ビュー",
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
          badge: "リーダー · テーマと E-Ink",
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
          badge: "オフライン辞典 · 翻訳",
          title: "ミステリー用語辞典の即時検索とネタバレ防止翻訳",
          description:
            "アリバイ、検死審問、密室などの本格ミステリー頻出用語を解説付きで収録。オフライン高速辞書と文脈翻訳をその場で利用できます。",
        },
      ],
      showcaseTitle: "読書進度に合わせた捜査ボードの変化（3ステップ実演）",
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
      moreFeaturesHeading: "その他の機能",
      moreFeaturesSubtitle:
        "古典本格ミステリーから大作長編まで、手元の EPUB / TXT 書籍を快適に読み解くためのツールを揃えています。",
      moreFeatures: [
        {
          title: "柔軟な1段組・見開き2段組レイアウト",
          desc: "スマートフォンの縦画面1段組からタブレットの見開き2段組、連続スクロールまで画面サイズに合わせて自在に切り替えられます。",
        },
        {
          title: "過去の章を振り返るタイムラインスライダー",
          desc: "現在のしおり位置を保ったまま、スライダーを戻して「第3章時点での人間関係と証言」を安全に振り返ることができます。",
        },
        {
          title: "証言と物証の照合・原文ジャンプ",
          desc: "登場人物ごとの主張と発見された物証を並べて比較し、気になった記述はワンタップで小説の原文段落へ戻って確認できます。",
        },
        {
          title: "細やかな組版カスタマイズ",
          desc: "フォントサイズ、行間、段落間隔、字下げ、余白を自由に調整し、自分にとって最も読みやすい紙面を作れます。",
        },
        {
          title: "夜間・羊皮紙・アイケア・E-Ink テーマ",
          desc: "目に優しい羊皮紙やグリーンのアイケア配色、暗所向けの夜間モード、電子ペーパー端末向けの白黒高コントラスト表示を搭載。",
        },
        {
          title: "オフライン推理用語辞典と読書ノート",
          desc: "ミステリー特有の専門用語をオフラインで即座に検索でき、人物や章に紐づけた自分だけの推理メモを残せます。",
        },
      ],
      mobileSectionTitle: "モバイル＆ E-Ink 版をダウンロード",
      mobileSectionDesc:
        "スマートフォン、タブレット、Android 搭載 E-Ink リーダーで、ネタバレのない捜査ボード付き読書をいつでもどこでも楽しめます。",
      mobileSectionCta: "アプリをダウンロード (v0.0.1 APK) →",
      faqHeading: "よくある質問",
      faqs: [
        {
          question: "なぜ後半の章のネタバレが表示されないのですか？",
          answer:
            "すべての人物・関係・証言データに初出の章と段落番号が記録されており、現在の読書進度より先の情報は自動的にロック・非表示になる仕組みです。",
        },
        {
          question: "アカウント登録なし・完全オフラインでも使えますか？",
          answer:
            "はい。書籍のインポート、読書、テーマ変更、オフライン用語辞典、端末内の捜査ボード閲覧はすべてログイン不要・オフラインで利用できます。",
        },
        {
          question: "BOOX などの Android 電子ペーパー（E-Ink）端末に対応していますか？",
          answer:
            "はい。アニメーションを無効化し、くっきりとした白黒実線のみで描画する専用 E-Ink モードを備えており、残像を抑えて快適に操作できます。",
        },
        {
          question: "ダウンロードした APK ファイルの安全性はどう確認できますか？",
          answer:
            "ダウンロードページにて SHA-256 チェックサムと署名証明書のフィンガープリントを公開しており、インストール前に検証可能です。",
        },
      ],
      faqMoreTitle: "他にご質問がありますか？",
      faqMoreSub: "いつでもお気軽にメールでお問い合わせください：",
      copyBtnText: "コピー",
      copiedBtnText: "コピー完了 ✓",
      footerCtaTitle: "無料で使い始める",
      footerCtaSub: "ネタバレのない新しいミステリー読書体験を始めましょう。",
      privacyLinkText: "プライバシーポリシー",
      termsLinkText: "利用規約",
      contactLabel: "お問い合わせ: support@mixuread.com",
      icpNote: "mixuread.com · Mixu ミステリー読書アプリ",
    };
  }

  return {
    navGallery: "我们的功能",
    navShowcase: "案情板体验",
    navFeatures: "三条价值",
    navFaq: "常见问题",
    navDownload: "下载 v0.0.1",
    einkToggleLabel: "E-Ink 墨水屏",
    releaseBadge: "v0.0.1 Alpha · Android 与墨水屏安装包已发布",
    rotatePrefix: "支持",
    rotateWords: [
      "防剧透进度锁",
      "2D 案情关系板",
      "证言一键回跳",
      "墨水屏零残影",
      "离线推理词典",
    ],
    downloadNowBtn: "立即下载",
    githubStarNote: "谜序 Mixu 客户端与核心引擎开源，欢迎在 GitHub 上 Star",
    heroQuickTabs: [
      {
        id: "tab-caseboard",
        label: "2D 案情图板",
        imageFile: "caseboard-2d.png",
        caption: "随阅读进度展开的 2D 人物与证物关系板，支持顶部滑块回看历史章节",
      },
      {
        id: "tab-reader",
        label: "双栏精排阅读",
        imageFile: "reader-spread.png",
        caption: "媲美实体精装书的平板双栏分页排版，底部一键呼出目录、查词与案情板",
      },
      {
        id: "tab-claims",
        label: "证言与线索核对",
        imageFile: "caseboard-claims.png",
        caption: "汇总已浮现的现场勘验与嫌疑人证词，点击任意条目直接跳回小说原句",
      },
      {
        id: "tab-dict",
        label: "离线推理词典",
        imageFile: "dictionary-translate.png",
        caption: "内置古典与本格推理专有名词词典，支持 1ms 离线秒查与双引擎段落精译",
      },
      {
        id: "tab-desk",
        label: "侦探书房伴读",
        imageFile: "hero-mystery-desk.jpg",
        caption: "一边展卷阅读长篇悬疑，一边在平板或墨水屏上梳理线索网",
      },
    ],
    pillarsSubtitle: "全面升级的悬疑推理阅读体验",
    pillar1Title: "进度锁防剧透",
    pillar1Desc:
      "案情板严格跟随你的当前阅读页码：读到第 10 章，就绝不会剧透第 14 章才揭晓的真凶身份与反转。",
    pillar2Title: "原文一键回跳",
    pillar2Desc:
      "案情板上的每一条人物关系、不在场证明与关键物证都带有段落定位，点一下即可跳回原文核对伏笔。",
    pillar3Title: "全端离线与墨水屏适配",
    pillar3Desc:
      "免登录离线即用，自适应手机竖屏、平板双栏与 E-Ink 电纸书高对比度无残影模式。",
    valArt1Label: "01 · 书签级防剧透屏障（只显示已读章节）",
    valArt2Label: "02 · 案情板红线直连原文段落",
    valArt3Label: "03 · 离线即用 · 墨水屏与平板静心伴读",
    galleryTitle: "我们的功能",
    gallerySubtitle:
      "从自动梳理人物关系的 2D 案情图板、一键回跳原文的证言核对表，到双栏精排、护眼主题与离线推理词典——点击任意窗口即可放大查看高清实拍。",
    filterAll: "全部功能实拍 (8)",
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
    moreFeaturesHeading: "更多功能",
    moreFeaturesSubtitle:
      "导入本地 EPUB 或 TXT 图书即可直接开读，把繁琐的人物谱系与时间线记忆交给谜序，把解谜的乐趣留给自己。",
    moreFeatures: [
      {
        title: "灵活单双栏布局",
        desc: "在手机单栏、平板双栏仿真书页与连续滚动视图之间自由切换，自适应各种屏幕尺寸。",
      },
      {
        title: "历史进度复盘滑块",
        desc: "随时向前回拨案情板顶部的时间轴滑块，安全回顾前几章的人物关系状态，不丢失当前阅读书签。",
      },
      {
        title: "证言与不在场证明比对",
        desc: "集中归档各执一词的人物证言与现场物证，发现矛盾之处可一键跳回小说对应原句核实。",
      },
      {
        title: "完全自定义排版",
        desc: "自由调节字号、行距、段距、首行缩进与页边距，打造最适合你长篇阅读习惯的纸书版面。",
      },
      {
        title: "夜间、羊皮纸与墨水屏模式",
        desc: "切换到羊皮纸、青茗护眼、深色夜读或 E-Ink 1-bit 纯黑白高对比度模式，日夜阅读均清晰舒适。",
      },
      {
        title: "离线推理词典与专属档案",
        desc: "毫秒级检索古典与本格推理专有术语，并为每位嫌疑人记录跟随阅读进度的无剧透随书笔记。",
      },
    ],
    mobileSectionTitle: "下载移动版与墨水屏客户端",
    mobileSectionDesc:
      "随时随地享受不剧透的悬疑伴读体验。谜序 Mixu 为 Android 手机、平板与电纸书墨水屏设备提供离线优先、免登录即用的现代推理阅读器。",
    mobileSectionCta: "下载应用 (v0.0.1 APK) →",
    faqHeading: "常见问题",
    faqs: [
      {
        question: "谜序是如何保证绝对不剧透后续章节的？",
        answer:
          "案情板中的每个人物、关系与证言都绑定了首次出场的章节与段落锚点。在你读到对应段落之前，后续章节的节点与反转在本地会被严格过滤锁止，绝不提前展示。",
      },
      {
        question: "不注册登录、断网状态下可以使用全部核心阅读功能吗？",
        answer:
          "可以。本地导入 EPUB / TXT 书籍、单双栏分页阅读、护眼与墨水屏主题、书签笔记、离线推理词典以及已导入的案情图包均支持 100% 离线运行。",
      },
      {
        question: "支持文石 BOOX、掌阅等 Android 墨水屏电纸书吗？",
        answer:
          "原生支持。点击顶部或阅读设置中的「E-Ink 墨水屏模式」，界面会立即关闭过渡动画并切换为高对比度纯黑白实线渲染，彻底消除电纸书翻页残影。",
      },
      {
        question: "如何校验下载的客户端 APK 安装包未被篡改？",
        answer:
          "点击进入下载页面即可查看官方发布的 SHA-256 校验和与 apksigner 签名证书指纹说明，安装前可一行命令完成校验。",
      },
    ],
    faqMoreTitle: "还有其他问题吗？",
    faqMoreSub: "请随时向我们发送邮件询问：",
    copyBtnText: "复制",
    copiedBtnText: "已复制 ✓",
    footerCtaTitle: "开始免费使用",
    footerCtaSub: "准备好开启不剧透的长篇悬疑推理阅读体验了吗？",
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
  const valuesHeading =
    heroUi?.valuesHeading ?? (locale === "en" ? "Core Values" : locale === "ja" ? "3つの価値" : "三条价值");
  const audienceHeading =
    heroUi?.audienceHeading ?? (locale === "en" ? "Who It Is For" : locale === "ja" ? "対象読者" : "适合谁");
  const limitationsHeading =
    heroUi?.limitationsHeading ??
    (locale === "en"
      ? "Who It Is Not For (Honest Limitations)"
      : locale === "ja"
        ? "対象外の方（誠実な説明）"
        : "不适合谁（诚实说明）");

  const primaryCta = data.ctas.find((c) => c.isPrimary) ?? data.ctas[0];
  const secondaryCta = data.ctas.find((c) => !c.isPrimary) ?? data.ctas[1];

  const primaryHintHtml = primaryCta?.hint ? ` <span class="cta-hint">${primaryCta.hint}</span>` : "";
  const secondaryHintHtml = secondaryCta?.hint ? ` <span class="cta-hint">${secondaryCta.hint}</span>` : "";

  const heroTabsHtml = copy.heroQuickTabs
    .map(
      (tab, idx) => `
                <button
                  type="button"
                  class="hero-window-tab${idx === 0 ? " active" : ""}"
                  data-hero-tab-src="${assetPrefix}/screenshots/${tab.imageFile}"
                  data-hero-tab-caption="${escapeHtml(tab.caption)}"
                  aria-selected="${idx === 0 ? "true" : "false"}"
                >
                  ${escapeHtml(tab.label)}
                </button>`
    )
    .join("\n");

  const galleryCardsHtml = copy.screenshots
    .map(
      (shot) => `
            <article class="bento-feature-card screenshot-card" data-shot-category="${shot.category}">
              <div class="bento-card-head">
                <div class="bento-card-title-row">
                  <h3>${escapeHtml(shot.title)}</h3>
                  <button
                    type="button"
                    class="bento-corner-btn"
                    data-lightbox-src="${assetPrefix}/screenshots/${shot.imageFile}"
                    data-lightbox-title="${escapeHtml(shot.title)}"
                    data-lightbox-desc="${escapeHtml(shot.description)}"
                    aria-label="${escapeHtml(shot.title)} — ${escapeHtml(copy.zoomHint)}"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                  </button>
                </div>
                <p>${escapeHtml(shot.description)}</p>
              </div>
              <button
                type="button"
                class="bento-window-trigger screenshot-Preview-trigger"
                data-lightbox-src="${assetPrefix}/screenshots/${shot.imageFile}"
                data-lightbox-title="${escapeHtml(shot.title)}"
                data-lightbox-desc="${escapeHtml(shot.description)}"
                aria-label="${escapeHtml(shot.title)} — ${escapeHtml(copy.zoomHint)}"
              >
                <div class="app-window-frame">
                  <div class="app-window-bar" aria-hidden="true">
                    <span class="win-dot dot-red"></span>
                    <span class="win-dot dot-amber"></span>
                    <span class="win-dot dot-green"></span>
                    <span class="win-bar-title">${escapeHtml(shot.badge)}</span>
                  </div>
                  <div class="screenshot-frame">
                    <img
                      src="${assetPrefix}/screenshots/${shot.imageFile}"
                      alt="${escapeHtml(shot.title)}"
                      width="1280"
                      height="700"
                    />
                  </div>
                </div>
              </button>
            </article>`
    )
    .join("\n");

  const moreFeaturesHtml = copy.moreFeatures
    .map(
      (item) => `
            <div class="more-feature-item">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.desc)}</p>
            </div>`
    )
    .join("\n");

  const faqsHtml = copy.faqs
    .map(
      (faq, i) => `
            <details class="koodo-faq-item"${i === 0 ? " open" : ""}>
              <summary class="koodo-faq-question">
                <span>${escapeHtml(faq.question)}</span>
                <span class="faq-plus-icon" aria-hidden="true">+</span>
              </summary>
              <div class="koodo-faq-answer">
                <p>${escapeHtml(faq.answer)}</p>
              </div>
            </details>`
    )
    .join("\n");

  const firstTab = copy.heroQuickTabs[0];

  return `
      <!-- Floating Pill Navbar (Koodo Reader Style) -->
      <div class="koodo-nav-shell">
        <div class="site-topbar koodo-pill-navbar">
          <a class="brand-lockup" href="./index.html">
            <img class="mark" src="${assetPrefix}/logo-mark.svg" alt="${escapeHtml(locCfg.siteName)}" width="34" height="34" />
            <span class="brand-name">${escapeHtml(locCfg.siteName)}</span>
          </a>
          <nav class="topbar-nav" aria-label="Primary">
            <a href="#gallery">${escapeHtml(copy.navGallery)}</a>
            <a href="#showcase">${escapeHtml(copy.navShowcase)}</a>
            <a href="#demo">${escapeHtml(copy.navFeatures)}</a>
            <a href="#faq">${escapeHtml(copy.navFaq)}</a>
          </nav>
          <div class="topbar-actions">
            <button type="button" id="eink-toggle" class="eink-toggle-btn" aria-pressed="false">${escapeHtml(copy.einkToggleLabel)}</button>
            ${langSwitcher}
            <a class="topbar-download-pill" href="./download.html">${escapeHtml(copy.navDownload)}</a>
          </div>
        </div>
      </div>

      <!-- Spacious Centered Hero Section (Koodo Reader Style) -->
      <header class="hero-header koodo-hero-section">
        <div class="hero-badge-row">
          <a class="release-pill" href="./download.html">
            <span class="release-dot" aria-hidden="true"></span>
            <span>${escapeHtml(copy.releaseBadge)}</span>
          </a>
        </div>

        <h1 class="koodo-hero-title">
          <span class="hero-main-headline">${data.headline}</span>
          <span class="hero-rotate-line">
            <span class="hero-rotate-prefix">${escapeHtml(copy.rotatePrefix)}</span>
            <span
              id="hero-rotate-word"
              class="hero-rotate-word"
              data-rotate-words="${escapeHtml(copy.rotateWords.join("|"))}"
            >${escapeHtml(copy.rotateWords[0] ?? "")}</span>
          </span>
        </h1>

        <div class="koodo-hero-subhead">
          ${data.subheadHtml}
        </div>

        <div class="cta-group koodo-cta-row">
          <a class="cta cta-outline-pill" href="${primaryCta?.href ?? "#showcase"}">
            <svg class="cta-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span class="cta-label">${primaryCta?.label ?? ""}</span>${primaryHintHtml}
          </a>
          <a class="cta cta-solid-pill" href="./download.html">
            <svg class="cta-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span class="cta-label">${escapeHtml(copy.downloadNowBtn)}</span>
          </a>
        </div>

        <div class="koodo-github-row">
          <a
            class="koodo-github-link"
            href="${secondaryCta?.href ?? "https://github.com/mixu-app/mixu-client"}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            <span>${secondaryCta?.label ?? ""}${secondaryHintHtml} · ${escapeHtml(copy.githubStarNote)}</span>
          </a>
        </div>

        <!-- Interactive Framed App Stage in Hero -->
        <div class="hero-window-stage">
          <div class="hero-window-frame">
            <div class="hero-window-topbar">
              <div class="window-dots" aria-hidden="true">
                <span class="win-dot dot-red"></span>
                <span class="win-dot dot-amber"></span>
                <span class="win-dot dot-green"></span>
              </div>
              <div class="hero-window-tabs" role="tablist" aria-label="Hero Preview Switcher">
                ${heroTabsHtml}
              </div>
            </div>
            <button
              type="button"
              id="hero-stage-trigger"
              class="hero-stage-screen"
              data-lightbox-src="${assetPrefix}/screenshots/${firstTab?.imageFile ?? "caseboard-2d.png"}"
              data-lightbox-title="${escapeHtml(firstTab?.label ?? "")}"
              data-lightbox-desc="${escapeHtml(firstTab?.caption ?? "")}"
            >
              <img
                id="hero-stage-img"
                src="${assetPrefix}/screenshots/${firstTab?.imageFile ?? "caseboard-2d.png"}"
                alt="${escapeHtml(firstTab?.caption ?? "")}"
                width="1280"
                height="691"
              />
            </button>
          </div>
          <p id="hero-stage-caption" class="hero-stage-caption">${escapeHtml(firstTab?.caption ?? "")}</p>
        </div>
      </header>

      <!-- Band 2: 3-Column Icon Pillars + Core Values (Koodo Warm Beige Band) -->
      <section id="demo" class="koodo-band koodo-band-beige values">
        <div class="koodo-container">
          <div class="koodo-section-head">
            <h2>${valuesHeading}</h2>
            <p class="koodo-section-sub">${escapeHtml(copy.pillarsSubtitle)}</p>
          </div>

          <div class="koodo-pillars-grid">
            <div class="koodo-pillar-card">
              <div class="koodo-pillar-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FB9937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <h3>${escapeHtml(copy.pillar1Title)}</h3>
              <p>${escapeHtml(copy.pillar1Desc)}</p>
            </div>

            <div class="koodo-pillar-card">
              <div class="koodo-pillar-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FB9937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </div>
              <h3>${escapeHtml(copy.pillar2Title)}</h3>
              <p>${escapeHtml(copy.pillar2Desc)}</p>
            </div>

            <div class="koodo-pillar-card">
              <div class="koodo-pillar-icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FB9937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
              <h3>${escapeHtml(copy.pillar3Title)}</h3>
              <p>${escapeHtml(copy.pillar3Desc)}</p>
            </div>
          </div>

          <div class="values-visual-trio">
            <figure class="bookplate-card">
              <button
                type="button"
                class="bookplate-img-btn"
                data-lightbox-src="${assetPrefix}/screenshots/illus-spoiler-shield.jpg"
                data-lightbox-title="${escapeHtml(copy.valArt1Label)}"
                data-lightbox-desc="${escapeHtml(copy.pillar1Desc)}"
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
                data-lightbox-desc="${escapeHtml(copy.pillar2Desc)}"
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
                data-lightbox-desc="${escapeHtml(copy.pillar3Desc)}"
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

          <div class="values-verbatim-box">
            ${data.valuesHtml}
          </div>
        </div>
      </section>

      <!-- Band 3: Dark Bento Framed Screenshot Section (Koodo Style) -->
      <section id="gallery" class="koodo-band koodo-band-dark gallery-section">
        <div class="koodo-container">
          <div class="koodo-section-head koodo-head-light">
            <h2>${escapeHtml(copy.galleryTitle)}</h2>
            <p class="koodo-section-sub">${escapeHtml(copy.gallerySubtitle)}</p>
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

          <div class="bento-feature-grid" id="screenshot-grid">
            ${galleryCardsHtml}
          </div>
        </div>
      </section>

      <!-- Band 4: Interactive 3-Step CaseBoard Progress Sandbox -->
      <section id="showcase" class="koodo-band koodo-band-paper showcase-section">
        <div class="koodo-container">
          <div class="koodo-section-head">
            <h2>${escapeHtml(copy.showcaseTitle)}</h2>
            <p class="koodo-section-sub">${escapeHtml(copy.showcaseSubtitle)}</p>
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
        </div>
      </section>

      <!-- Band 5: More Features 3x2 Clean Grid + Who It Is For -->
      <section class="koodo-band koodo-band-beige">
        <div class="koodo-container">
          <div class="koodo-section-head">
            <h2>${escapeHtml(copy.moreFeaturesHeading)}</h2>
            <p class="koodo-section-sub">${escapeHtml(copy.moreFeaturesSubtitle)}</p>
          </div>

          <div class="more-features-grid">
            ${moreFeaturesHtml}
          </div>

          <div class="dual-section-grid">
            <section class="audience-card audience">
              <h2>${audienceHeading}</h2>
              ${data.audienceHtml}
            </section>

            <section class="audience-card limitations">
              <h2>${limitationsHeading}</h2>
              ${data.limitationsHtml}
            </section>
          </div>
        </div>
      </section>

      <!-- Band 6: Split Mobile & E-Ink Download Section (Koodo Style) -->
      <section class="koodo-band koodo-band-light">
        <div class="koodo-container">
          <div class="koodo-download-split">
            <div class="koodo-download-copy">
              <h2>${escapeHtml(copy.mobileSectionTitle)}</h2>
              <p>${escapeHtml(copy.mobileSectionDesc)}</p>
              <a class="koodo-amber-link" href="./download.html">${escapeHtml(copy.mobileSectionCta)}</a>
            </div>
            <div class="koodo-download-visual">
              <button
                type="button"
                class="download-visual-card"
                data-lightbox-src="${assetPrefix}/screenshots/hero-mystery-desk.jpg"
                data-lightbox-title="${escapeHtml(copy.mobileSectionTitle)}"
                data-lightbox-desc="${escapeHtml(copy.mobileSectionDesc)}"
              >
                <img
                  src="${assetPrefix}/screenshots/hero-mystery-desk.jpg"
                  alt="${escapeHtml(copy.mobileSectionTitle)}"
                  width="1280"
                  height="714"
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Band 7: FAQ Accordion & Email Copy Pill (Koodo Style) -->
      <section id="faq" class="koodo-band koodo-band-paper">
        <div class="koodo-container koodo-faq-container">
          <div class="koodo-section-head">
            <h2>${escapeHtml(copy.faqHeading)}</h2>
          </div>

          <div class="koodo-faq-list">
            ${faqsHtml}
          </div>

          <div class="koodo-contact-box">
            <h3>${escapeHtml(copy.faqMoreTitle)}</h3>
            <p>${escapeHtml(copy.faqMoreSub)}</p>
            <div class="koodo-email-pill">
              <span id="support-email-text">support@mixuread.com</span>
              <button
                type="button"
                id="copy-email-btn"
                class="koodo-copy-btn"
                data-copy-value="support@mixuread.com"
                data-copy-label="${escapeHtml(copy.copyBtnText)}"
                data-copied-label="${escapeHtml(copy.copiedBtnText)}"
              >
                ${escapeHtml(copy.copyBtnText)}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Lightbox Modal -->
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

      <!-- Band 8: Dark Navy Footer CTA (Koodo Style) -->
      <footer class="koodo-dark-footer footer-disclaimers note">
        <div class="koodo-container">
          <div class="koodo-footer-cta">
            <h2>${escapeHtml(copy.footerCtaTitle)}</h2>
            <p>${escapeHtml(copy.footerCtaSub)}</p>
            <div class="koodo-cta-row">
              <a class="cta cta-footer-light" href="#showcase">
                <span class="cta-label">${primaryCta?.label ?? ""}</span>
              </a>
              <a class="cta cta-footer-outline" href="./download.html">
                <span class="cta-label">${escapeHtml(copy.downloadNowBtn)}</span>
              </a>
            </div>
          </div>

          <div class="koodo-footer-disclaimers">
            ${data.disclaimersHtml}
          </div>

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
