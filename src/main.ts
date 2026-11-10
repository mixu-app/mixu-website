// SPDX-License-Identifier: Apache-2.0
// Mixu landing page interactive enhancements — Kindle E-Ink Light / Dark Engine

function triggerWaveformFlash(): void {
  const flash = document.getElementById("eink-flash-layer");
  if (!flash) return;
  flash.classList.remove("flash-active");
  void flash.offsetWidth;
  flash.classList.add("flash-active");
  setTimeout(() => {
    flash.classList.remove("flash-active");
  }, 220);
}

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
    idx = (idx + 1) % words.length;
    el.textContent = words[idx] ?? "";
  }, 2800);
}

function initHeroWindowTabs(): void {
  const tabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".hero-window-tab"),
  );
  const stageImg = document.getElementById(
    "hero-stage-img",
  ) as HTMLImageElement | null;
  const stageCaption = document.getElementById("hero-stage-caption");
  const stageTrigger = document.getElementById("hero-stage-trigger");
  const footerIdxEl = document.getElementById("kindle-footer-tab-idx");
  const prevBtn = document.getElementById("btn-oasis-prev");
  const nextBtn = document.getElementById("btn-oasis-next");
  const dogEarBtn = document.getElementById("dog-ear-bookmark");

  if (dogEarBtn) {
    dogEarBtn.addEventListener("click", () => {
      dogEarBtn.classList.toggle("bookmarked");
    });
  }

  if (tabs.length === 0 || !stageImg) return;

  let currentIndex = 0;

  const activateTab = (index: number, withFlash = true): void => {
    const normalized = ((index % tabs.length) + tabs.length) % tabs.length;
    const tab = tabs[normalized];
    if (!tab) return;
    currentIndex = normalized;

    const src = tab.getAttribute("data-hero-tab-src") ?? "";
    const caption = tab.getAttribute("data-hero-tab-caption") ?? "";
    const label = tab.textContent?.trim() ?? "";
    if (!src) return;

    if (withFlash) {
      triggerWaveformFlash();
    }

    tabs.forEach((t, i) => {
      const active = i === normalized;
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
    if (footerIdxEl) {
      const baseText = (footerIdxEl.textContent ?? "")
        .replace(/·\s*\d+\s*\/\s*\d+\s*$/, "")
        .trim();
      footerIdxEl.textContent = `${baseText} · ${normalized + 1} / ${tabs.length}`;
    }
  };

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      activateTab(idx, true);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      activateTab(currentIndex - 1, true);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      activateTab(currentIndex + 1, true);
    });
  }
}

function initHorizonShowcase(): void {
  const board = document.getElementById("horizon-board");
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    "[data-horizon-step]",
  );
  if (!board || buttons.length === 0) return;

  const updateStep = (step: number, withFlash = false): void => {
    if (withFlash) {
      triggerWaveformFlash();
    }
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
      updateStep(step, true);
    });
  });

  updateStep(0, false);
}

function initScreenshotGallery(): void {
  const filterBtns = document.querySelectorAll<HTMLButtonElement>(
    "[data-gallery-filter]",
  );
  const cards = document.querySelectorAll<HTMLElement>(
    ".screenshot-card[data-shot-category]",
  );
  if (filterBtns.length > 0 && cards.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-gallery-filter") ?? "all";
        triggerWaveformFlash();
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
  const lightboxImg = document.getElementById(
    "lightbox-img",
  ) as HTMLImageElement | null;
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxDesc = document.getElementById("lightbox-desc");
  const triggers = document.querySelectorAll<HTMLElement>(
    "[data-lightbox-src]",
  );
  const closeEls = document.querySelectorAll<HTMLElement>(
    "[data-lightbox-close]",
  );

  if (!lightbox || !lightboxImg) return;

  const openLightbox = (src: string, title: string, desc: string): void => {
    triggerWaveformFlash();
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
    const val =
      copyBtn.getAttribute("data-copy-value") ?? "support@mixuread.com";
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

function initLightDarkToggle(): void {
  const toggleBtn = document.getElementById("eink-toggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.getAttribute("data-panel-mode") === "dark";
    const lightLabel = toggleBtn.getAttribute("data-label-light") ?? "☀ Light";
    const darkLabel = toggleBtn.getAttribute("data-label-dark") ?? "☾ Dark";

    triggerWaveformFlash();
    if (isDark) {
      root.removeAttribute("data-panel-mode");
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.setAttribute("aria-label", darkLabel);
      toggleBtn.setAttribute("title", darkLabel);
    } else {
      root.setAttribute("data-panel-mode", "dark");
      toggleBtn.setAttribute("aria-pressed", "true");
      toggleBtn.setAttribute("aria-label", lightLabel);
      toggleBtn.setAttribute("title", lightLabel);
    }
  });
}

function initApkDownloadFeedback(): void {
  const downloadLinks = document.querySelectorAll<HTMLAnchorElement>(
    "[data-apk-download], a.download-button",
  );
  if (downloadLinks.length === 0) return;

  const ensureToast = (): HTMLElement => {
    let toast = document.getElementById("apk-download-toast");
    if (toast) return toast;

    toast = document.createElement("div");
    toast.id = "apk-download-toast";
    toast.className = "apk-download-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
    return toast;
  };

  downloadLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const toast = ensureToast();
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isInAppWebView = /MicroMessenger|QQ\/|Weibo/i.test(ua);

      if (isInAppWebView) {
        toast.innerHTML = `
          <div class="apk-toast-body">
            <strong>检测到内置浏览器限制直接下载 APK</strong>
            <span>请点击右上角「⋯」选择「在系统浏览器中打开」，或前往 <a href="./download.html">下载与校验页</a>。</span>
          </div>
          <button type="button" class="apk-toast-close" aria-label="关闭提示">×</button>
        `;
      } else {
        toast.innerHTML = `
          <div class="apk-toast-body">
            <strong>已开始下载 mixu-app-0.0.1.apk (8.9 MB)</strong>
            <span>请留意浏览器下载栏 · <a href="./download.html">查看 SHA-256 校验和与签名说明 →</a></span>
          </div>
          <button type="button" class="apk-toast-close" aria-label="关闭提示">×</button>
        `;
      }

      toast.classList.add("is-visible");
      const closeBtn =
        toast.querySelector<HTMLButtonElement>(".apk-toast-close");
      if (closeBtn) {
        closeBtn.addEventListener(
          "click",
          () => {
            toast.classList.remove("is-visible");
          },
          { once: true },
        );
      }
    });
  });
}

function initAll(): void {
  initHeroRotatingWords();
  initHeroWindowTabs();
  initHorizonShowcase();
  initScreenshotGallery();
  initEmailCopyButton();
  initLightDarkToggle();
  initApkDownloadFeedback();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
}

export {};
