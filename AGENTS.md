# mixu-website agent guide

## Scope and authority

- Governs only this repository. Workspace rules in `../AGENTS.md` apply.
- Public repository. Copy (`content/**`) is reader-facing Chinese; site code,
  when it exists, is Apache-2.0.
- Positioning authority: `mixu-docs` → `docs/product/product-brief.md`. Feature
  claims must map to a milestone in `docs/roadmap-and-decisions.md`; if they do
  not, they do not go on the page.

## Copy rules

1. **Honest status.** The product is documentation-first; say so. Never use
   "已上线/已支持" for an unimplemented capability.
2. **No real-book demo material.** Any screenshot, graph image or demo uses the
   synthetic corpus from `mixu-fixtures`. Never a published novel's graph.
3. **No absolute promise.** "不剧透" is an engineering objective with
   fixture-backed tests; it is not a mathematical guarantee. Keep the footnote
   that says so.
4. **Open source ≠ free service.** Say that code licences cover code, not the
   hosted AI, the catalog or the brand.
5. **No spoiler in the marketing itself.** A hero section must not reveal a plot
   point to sell the anti-spoiler feature.

## Structure

- `content/hero.zh-CN.md`: hero headline, subhead, three values, audience,
  primary/secondary CTA, mandatory footer disclaimers.
- New pages get their own file under `content/`, named `<section>.<locale>.md`.
- Keep copy blocks short enough to survive translation into UI strings.

## Gates

```sh
just check     # markdownlint (copy is reviewed like code)
```

## CarryCtx

- `cd` here before `carryctx` or Git; branches `ctx-XXXX/<type>-<slug>`.
- No commit, push or release without authorization.

## Review checklist

1. Does every claim map to a milestone or a shipped capability?
2. Is the status disclaimer present and readable?
3. Is any demo material synthetic (fixtures only)?
4. Does the page leak a plot point?
5. Are the trademark and licence statements consistent with `.github/TRADEMARKS.md`?
