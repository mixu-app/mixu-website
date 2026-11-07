# mixu-website quality gates. Run via `just check`, never bare tool invocations.
set shell := ["bash", "-euo", "pipefail", "-c"]

check: lint-md bun-check

lint-md:
    markdownlint-cli2 --config .markdownlint-cli2.jsonc

# Bun is the only build toolchain: install, typecheck, test, build.
# Known environment defect: on some hosts `bun`/`bunx` segfault (rc=139) and print
# nothing, which looks like a pass. A silent bun run is treated as a failure.
bun-check:
    @command -v bun >/dev/null || { echo "MISSING TOOL: bun"; exit 1; }
    @if ! bun --version >/dev/null 2>&1; then \
        echo "ENV DEFECT: bun segfaults on this host (rc=139, known environment issue)."; \
        echo "The gate cannot run. Fix bun (reinstall / different build) or verify in CI;"; \
        echo "\`just node-typecheck\` only covers types. This is not a code failure."; \
        exit 1; \
    fi
    bun install
    bun run check

# Local fallback when bun is broken on this host; CI remains the authority.
node-typecheck:
    npx --no-install tsc --noEmit
