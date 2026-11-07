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
    bun install   # TODO: switch to --frozen-lockfile once bun.lock is generated (bun segfaults on the authoring host)
    bun run check

# Local fallback when bun is broken on this host; CI remains the authority.
node-typecheck:
    npx --no-install tsc --noEmit
