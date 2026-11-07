# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `scripts/render-hero.ts` parses `content/hero.zh-CN.md` into `src/index.html`
  via `src/index.template.html` before build, rendering the hero copy verbatim
  using Bun built-ins without external frameworks.
- `tests/rendered-hero.test.ts` validates that rendered HTML and built artifacts
  contain the hero headline, subhead, values, audience, limitations, CTAs, and
  disclaimers verbatim, and that missing content files fail the build.
- Download page skeleton (`src/download.template.html`, `scripts/render-download.ts`,
  and generated `src/download.html` bundled to `dist/download.html`). Honestly
  states the pre-release phase without simulated fake builds, and provides links
  back to home and the open-source client repository.
- Download catalog manifest schema (`content/download-manifest.schema.json`) and
  initial manifest (`content/download-manifest.json`) initialized with an empty
  releases array.
- Release artifact authenticity and signature verification documentation, covering
  SHA-256 checksum checks and Android APK Signature Scheme v2/v3 verification
  using `apksigner`.
- Comprehensive tests in `tests/download-page.test.ts` verifying schema conformance,
  honest phase notice rendering, verification instructions, and built dist output.
- Bun-only site scaffold: static `src/index.html`, `src/style.css`, a small
  capability-probing `src/main.ts`, and `package.json` scripts (`dev`, `build`,
  `typecheck`, `test`, `check`). No framework, no bundler, no separate linter or
  formatter packages.
- `tests/hero-copy.test.ts` asserts that the mandatory statements in
  `content/hero.zh-CN.md` survive a copy rewrite (development phase, qualified
  spoiler guarantee, open-source vs hosted service).
- `justfile` gates: markdownlint plus bun typecheck/test/build, with a documented
  bun-segfault caveat and a node typecheck fallback.
