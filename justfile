# mixu-website quality gates. Run via `just check`, never bare tool invocations.
set shell := ["bash", "-euo", "pipefail", "-c"]

check: lint-md

lint-md:
    markdownlint-cli2 --config .markdownlint-cli2.jsonc
