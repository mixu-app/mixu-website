# Rule: repository scope (mixu-website)

- Visibility: **public**. Everything committed here is world-readable forever.
- Stack: TypeScript + Bun (no framework).
- Do not edit: `node_modules/`, `dist/`, real-book demo assets.
- Gate: `just check` (the command recorded in `[verification]`). A gate that
  cannot run fails loudly; a documented phase exception is the only skip.
- Language: English for code, comments, docs, commit subjects; Chinese only for
  reader-facing UI copy and a public README body.
- Never commit: credentials, tokens, presigned URLs, book text, user notes,
  in-copyright extracted graphs.
- Task prefix is `CTX`; branches are `ctx-XXXX/<type>-<slug>`.
