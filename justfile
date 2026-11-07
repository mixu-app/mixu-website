# mixu-website quality gates. Run via `just check`, never bare tool invocations.
set shell := ["bash", "-euo", "pipefail", "-c"]

check: lint-md bun-check

lint-md:
    markdownlint-cli2 --config .markdownlint-cli2.jsonc

# Bun is the only build toolchain: install, typecheck, test, build.
# The lockfile is committed and the gate installs from it (`--frozen-lockfile`), so
# a dependency change is a reviewable diff, not a silent upgrade.
# Known environment defect: on some hosts `bun`/`bunx` segfault (rc=139) and print
# nothing, which looks like a pass. A silent bun run is treated as a failure; use
# `just bun-docker` there.
bun-check:
    @command -v bun >/dev/null || { echo "MISSING TOOL: bun"; exit 1; }
    @if ! bun --version >/dev/null 2>&1; then \
        echo "ENV DEFECT: bun segfaults on this host (rc=139, known environment issue)."; \
        echo "The gate cannot run. Fix bun (reinstall / different build) or verify in CI;"; \
        echo "\`just node-typecheck\` only covers types. This is not a code failure."; \
        exit 1; \
    fi
    bun install --frozen-lockfile
    bun run check

# Run the same gate inside the pinned bun container: the supported path on hosts
# where the local bun binary segfaults. Same lockfile, same commands.
bun-docker:
    docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app oven/bun:latest \
        sh -c 'bun install --frozen-lockfile && bun run typecheck && bun test && bun run build'

# Local fallback when bun is broken on this host; CI remains the authority.
node-typecheck:
    npx --no-install tsc --noEmit
