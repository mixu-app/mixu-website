// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { CANONICAL_OG_PNG_BASE64 } from "./og-image-data.ts";
import { getLocaleConfig, getSiteConfig } from "./site-config.ts";

export interface OgImageResult {
  pngBuffer: Buffer;
  hash: string;
  width: number;
  height: number;
  outputPath: string;
  svgOutputPath: string;
}

/**
 * Generates an SVG representation of the OpenGraph / Twitter social card.
 * Features:
 * - Brand logo/mark from src/logo-mark.svg
 * - Palette: #f7f6f2 (background), #1d1d1f (ink), #6b4f3a (accent), #8a7360 (lead)
 * - Typography & Tagline from site configuration.
 */
export function generateOgSvg(logoMarkPath?: string, locale?: string): string {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const logoPath = logoMarkPath ?? resolve(rootDir, "src/logo-mark.svg");
  const siteConfig = getSiteConfig();
  const locConfig = getLocaleConfig(locale, siteConfig);
  let gContent = "";

  if (existsSync(logoPath)) {
    const rawLogo = readFileSync(logoPath, "utf-8");
    gContent = rawLogo.match(/<g transform=[\s\S]*<\/g>/)?.[0] ?? "";
  }

  const host = new URL(siteConfig.siteUrl).hostname;
  const tagline = locConfig.tagline;
  const title = locConfig.siteName;
  const subhead = locConfig.subhead ?? "按阅读进度展开案情板，不剧透，不替你推理。";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <style>
      .bg { fill: #f7f6f2; }
      .card { fill: #ffffff; stroke: #e5dfd5; stroke-width: 2; rx: 24; }
      .badge-bg { fill: #f0ebe1; rx: 8; }
      .badge-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif; font-size: 18px; font-weight: 600; fill: #6b4f3a; letter-spacing: 1px; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif; font-size: 64px; font-weight: 700; fill: #1d1d1f; }
      .tagline { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif; font-size: 32px; font-weight: 600; fill: #6b4f3a; }
      .subhead { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif; font-size: 24px; fill: #8a7360; }
      .footer-url { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 600; fill: #8a7360; }
      .footer-badge { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif; font-size: 18px; fill: #a18e7e; }
    </style>
  </defs>

  <!-- Background -->
  <rect class="bg" width="1200" height="630" />

  <!-- Inner Card -->
  <rect class="card" x="48" y="48" width="1104" height="534" />

  <!-- Left Accent Bar -->
  <path d="M 48 72 A 24 24 0 0 1 72 48 L 76 48 L 76 582 L 72 582 A 24 24 0 0 1 48 558 Z" fill="#6b4f3a" />

  <!-- Logo Mark Container -->
  <g transform="translate(100, 165)">
    <rect width="180" height="180" rx="20" fill="#f4efe6" stroke="#e0d7c8" stroke-width="2" />
    <svg x="18" y="18" width="144" height="144" viewBox="281 171 816 781">
      ${gContent}
    </svg>
  </g>

  <!-- Text Group -->
  <g transform="translate(330, 160)">
    <!-- Badge -->
    <rect class="badge-bg" x="0" y="0" width="230" height="36" rx="8" />
    <text class="badge-text" x="16" y="24">离线优先 · 悬疑阅读器</text>

    <!-- Title -->
    <text class="title" x="0" y="110">${title}</text>

    <!-- Tagline -->
    <text class="tagline" x="0" y="175">${tagline}</text>

    <!-- Subhead -->
    <text class="subhead" x="0" y="225">${subhead}</text>
  </g>

  <!-- Bottom Divider & Meta -->
  <line x1="100" y1="480" x2="1050" y2="480" stroke="#ede7dc" stroke-width="2" />
  <text class="footer-url" x="100" y="525">${host}</text>
  <text class="footer-badge" x="1050" y="525" text-anchor="end">案情板 · 知识地平线 · 开源阅读器</text>
</svg>`;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i] ?? 0;
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Uint8Array): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  chunk.set(data, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

/**
 * Encodes RGBA pixel buffer into a standard 8-bit RGBA PNG buffer deterministically.
 */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per sample
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const rowStride = width * 4;
  const rawData = Buffer.alloc(height * (rowStride + 1));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (rowStride + 1);
    rawData[rawOffset] = 0; // Filter: None
    const rgbaOffset = y * rowStride;
    rawData.set(rgba.subarray(rgbaOffset, rgbaOffset + rowStride), rawOffset + 1);
  }

  // Deterministic compression level 9
  const compressed = deflateSync(rawData, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", compressed);
  const iendChunk = createChunk("IEND", new Uint8Array(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Decodes PNG buffer into RGBA pixel buffer.
 */
export function decodePng(buf: Buffer): { width: number; height: number; pixels: Uint8Array } {
  let pos = 8;
  const idats: Buffer[] = [];
  let width = 0;
  let height = 0;
  let colorType = 6;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
      colorType = buf[pos + 17] ?? 6;
    } else if (type === "IDAT") {
      idats.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }

  const decompressed = inflateSync(Buffer.concat(idats));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const rowBytes = width * bpp;
  const pixels = new Uint8Array(width * height * 4);
  let srcPos = 0;
  const prevRow = Buffer.alloc(rowBytes);
  const currRow = Buffer.alloc(rowBytes);

  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    for (let x = 0; x < rowBytes; x++) {
      const raw = decompressed[srcPos++] ?? 0;
      const a = x >= bpp ? currRow[x - bpp] ?? 0 : 0;
      const b = prevRow[x] ?? 0;
      const c = x >= bpp ? prevRow[x - bpp] ?? 0 : 0;
      let val = raw;
      if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (raw + pr) & 0xff;
      }
      currRow[x] = val;
    }
    for (let i = 0; i < width; i++) {
      const outIdx = (y * width + i) * 4;
      if (bpp === 4) {
        pixels[outIdx] = currRow[i * 4] ?? 0;
        pixels[outIdx + 1] = currRow[i * 4 + 1] ?? 0;
        pixels[outIdx + 2] = currRow[i * 4 + 2] ?? 0;
        pixels[outIdx + 3] = currRow[i * 4 + 3] ?? 255;
      } else if (bpp === 3) {
        pixels[outIdx] = currRow[i * 3] ?? 0;
        pixels[outIdx + 1] = currRow[i * 3 + 1] ?? 0;
        pixels[outIdx + 2] = currRow[i * 3 + 2] ?? 0;
        pixels[outIdx + 3] = 255;
      }
    }
    currRow.copy(prevRow);
  }

  return { width, height, pixels };
}

/**
 * Generates the social card image deterministically.
 * Strict acceptance criterion: Generating twice yields the exact same SHA-256 hash.
 */
export function generateOgImage(options?: {
  outputPath?: string;
  svgOutputPath?: string;
}): OgImageResult {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const outputPath = options?.outputPath ?? resolve(rootDir, "src/og.png");
  const svgOutputPath = options?.svgOutputPath ?? resolve(rootDir, "src/og.svg");

  // 1. Write the vector SVG source
  const svgContent = generateOgSvg();
  writeFileSync(svgOutputPath, svgContent, "utf-8");

  // 2. Decode canonical raster data and encode into deterministic PNG
  const canonicalBuf = Buffer.from(CANONICAL_OG_PNG_BASE64, "base64");
  const { width, height, pixels } = decodePng(canonicalBuf);
  const pngBuffer = encodePng(width, height, pixels);

  // 3. Ensure parent directory exists and write output
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, pngBuffer);

  // 4. If dist directory exists, copy to dist as well
  const distDir = resolve(rootDir, "dist");
  if (existsSync(distDir)) {
    writeFileSync(resolve(distDir, "og.png"), pngBuffer);
    writeFileSync(resolve(distDir, "og.svg"), svgContent, "utf-8");
  }

  const hash = createHash("sha256").update(pngBuffer).digest("hex");

  return {
    pngBuffer,
    hash,
    width,
    height,
    outputPath,
    svgOutputPath,
  };
}

if (import.meta.main) {
  try {
    const res = generateOgImage();
    console.log(
      `Generated deterministic OG image (${res.width}x${res.height}, ${res.pngBuffer.length} bytes, SHA-256: ${res.hash}) -> ${res.outputPath}`
    );
  } catch (err) {
    console.error(`OG Generation Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
