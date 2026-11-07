// Entry point. Kept deliberately small: the page is static HTML plus CSS until a
// real information architecture exists. Anything added here must stay bun-native
// (no bundler plugins, no framework runtime).

const app = document.getElementById("app");
if (!app) {
  throw new Error("missing #app root element");
}

// A coarse capability probe keeps future progressive enhancement honest: we only
// activate behaviour when the platform supports it.
const supportsViewTransitions =
  "startViewTransition" in (document as Document & { startViewTransition?: unknown });

if (!supportsViewTransitions) {
  app.dataset.motion = "reduced";
}
