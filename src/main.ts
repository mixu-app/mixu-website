// SPDX-License-Identifier: Apache-2.0
// Mixu landing page interactive enhancements (progressive enhancement; works without JS)

function initHeroRotatingWords(): void {
  const el = document.getElementById("hero-rotate-word");
  if (!el) return;
  const raw = el.getAttribute("data-rotate-words") ?? "";
  const words = raw
    .split("|")
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length <= 1) return;

  let idx = 0;
  setInterval(() => {
    if (document.documentElement.getAttribute("data-theme") === "eink") {
      idx = (idx + 1) % words.length;
      el.textContent = words[idx] ?? "";
      return;
    }
    el.classList.add("is-switching");
    setTimeout(() => {
      idx = (idx + 1) % words.length;
      el.textContent = words[idx] ?? "";
      el.classList.remove("is-switching");
    }, 180);
  }, 2600);
}

function initHeroWindowTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".hero-window-tab");
  const stageImg = document.getElementById("hero-stage-img") as HTMLImageElement | null;
  const stageCaption = document.getElementById("hero-stage-caption");
  const stageTrigger = document.getElementById("hero-stage-trigger");
  if (tabs.length === 0 || !stageImg) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const src = tab.getAttribute("data-hero-tab-src") ?? "";
      const caption = tab.getAttribute("data-hero-tab-caption") ?? "";
      const label = tab.textContent?.trim() ?? "";
      if (!src) return;

      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });

      stageImg.src = src;
      stageImg.alt = caption;
      if (stageCaption) stageCaption.textContent = caption;
      if (stageTrigger) {
        stageTrigger.setAttribute("data-lightbox-src", src);
        stageTrigger.setAttribute("data-lightbox-title", label);
        stageTrigger.setAttribute("data-lightbox-desc", caption);
      }
    });
  });
}

function initHorizonShowcase(): void {
  const board = document.getElementById("horizon-board");
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-horizon-step]");
  if (!board || buttons.length === 0) return;

  const updateStep = (step: number): void => {
    board.setAttribute("data-active-step", String(step));
    buttons.forEach((btn) => {
      const btnStep = Number(btn.getAttribute("data-horizon-step") ?? "0");
      const isActive = btnStep === step;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const nodes = board.querySelectorAll<HTMLElement>(".clue-node");
    nodes.forEach((node) => {
      const minStep = Number(node.getAttribute("data-min-step") ?? "0");
      if (minStep >= 99) {
        node.classList.add("is-filtered");
      } else {
        node.classList.toggle("is-pending", step < minStep);
        node.classList.toggle("is-unlocked", step >= minStep);
      }
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = Number(btn.getAttribute("data-horizon-step") ?? "0");
      updateStep(step);
    });
  });

  updateStep(0);
}

function initScreenshotGallery(): void {
  const filterBtns = document.querySelectorAll<HTMLButtonElement>("[data-gallery-filter]");
  const cards = document.querySelectorAll<HTMLElement>(".screenshot-card[data-shot-category]");
  if (filterBtns.length > 0 && cards.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-gallery-filter") ?? "all";
        filterBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("active", active);
          b.setAttribute("aria-selected", active ? "true" : "false");
        });
        cards.forEach((card) => {
          const cat = card.getAttribute("data-shot-category") ?? "";
          const show = filter === "all" || cat === filter;
          card.toggleAttribute("hidden", !show);
        });
      });
    });
  }

  const lightbox = document.getElementById("screenshot-lightbox");
  const lightboxImg = document.getElementById("lightbox-img") as HTMLImageElement | null;
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxDesc = document.getElementById("lightbox-desc");
  const triggers = document.querySelectorAll<HTMLElement>("[data-lightbox-src]");
  const closeEls = document.querySelectorAll<HTMLElement>("[data-lightbox-close]");

  if (!lightbox || !lightboxImg) return;

  const openLightbox = (src: string, title: string, desc: string): void => {
    lightboxImg.src = src;
    lightboxImg.alt = title;
    if (lightboxTitle) lightboxTitle.textContent = title;
    if (lightboxDesc) lightboxDesc.textContent = desc;
    lightbox.removeAttribute("hidden");
  };

  const closeLightbox = (): void => {
    lightbox.setAttribute("hidden", "");
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const src = trigger.getAttribute("data-lightbox-src") ?? "";
      const title = trigger.getAttribute("data-lightbox-title") ?? "";
      const desc = trigger.getAttribute("data-lightbox-desc") ?? "";
      if (src) openLightbox(src, title, desc);
    });
  });

  closeEls.forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !lightbox.hasAttribute("hidden")) {
      closeLightbox();
    }
  });
}

function initEmailCopyButton(): void {
  const copyBtn = document.getElementById("copy-email-btn");
  if (!copyBtn) return;

  copyBtn.addEventListener("click", async () => {
    const val = copyBtn.getAttribute("data-copy-value") ?? "support@mixuread.com";
    const defaultLabel = copyBtn.getAttribute("data-copy-label") ?? "Copy";
    const copiedLabel = copyBtn.getAttribute("data-copied-label") ?? "Copied ✓";
    try {
      await navigator.clipboard.writeText(val);
      copyBtn.textContent = copiedLabel;
      setTimeout(() => {
        copyBtn.textContent = defaultLabel;
      }, 2000);
    } catch {
      copyBtn.textContent = val;
    }
  });
}

function initEinkToggle(): void {
  const toggleBtn = document.getElementById("eink-toggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const root = document.documentElement;
    const isEink = root.getAttribute("data-theme") === "eink";
    if (isEink) {
      root.removeAttribute("data-theme");
      toggleBtn.setAttribute("aria-pressed", "false");
    } else {
      root.setAttribute("data-theme", "eink");
      toggleBtn.setAttribute("aria-pressed", "true");
    }
  });
}

function initAll(): void {
  initHeroRotatingWords();
  initHeroWindowTabs();
  initHorizonShowcase();
  initScreenshotGallery();
  initEmailCopyButton();
  initEinkToggle();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
}

export {};
