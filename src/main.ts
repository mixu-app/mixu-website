// SPDX-License-Identifier: Apache-2.0
// Mixu landing page interactive enhancements — Kindle Colorsoft / Paperwhite / Oasis E-Ink Engine

type EInkPanelMode = "colorsoft" | "paperwhite" | "dark";

interface EInkOpticsState {
  mode: EInkPanelMode;
  brightness: number;
  warmth: number;
}

const opticsState: EInkOpticsState = {
  mode: "colorsoft",
  brightness: 16,
  warmth: 8,
};

function triggerWaveformFlash(isColor = false): void {
  const flash = document.getElementById("eink-flash-layer");
  if (!flash) return;
  flash.classList.remove("flash-active", "flash-color-active");
  // Force reflow so consecutive waveform flashes re-trigger cleanly
  void flash.offsetWidth;
  flash.classList.add(isColor ? "flash-color-active" : "flash-active");
  setTimeout(() => {
    flash.classList.remove("flash-active", "flash-color-active");
  }, 240);
}

function applyEInkOptics(): void {
  const root = document.documentElement;
  const { mode, brightness, warmth } = opticsState;

  root.setAttribute("data-panel-mode", mode);
  if (mode === "paperwhite") {
    root.setAttribute("data-theme", "eink");
  } else {
    root.removeAttribute("data-theme");
  }

  const toggleBtn = document.getElementById("eink-toggle");
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", mode === "paperwhite" ? "true" : "false");
  }

  document.querySelectorAll<HTMLButtonElement>("[data-eink-mode]").forEach((btn) => {
    const active = btn.getAttribute("data-eink-mode") === mode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (mode === "dark") {
    root.style.setProperty("--bg", "#171917");
    root.style.setProperty("--bg-beige", "#1e201d");
    root.style.setProperty("--bg-light", "#1b1d1a");
    root.style.setProperty("--surface", "#202320");
    root.style.setProperty("--surface-elevated", "#242724");
    root.style.setProperty("--fg", "#dcdbd2");
    root.style.setProperty("--muted", "#9ea199");
    root.style.setProperty("--border", "#3a3d38");
    root.style.setProperty("--border-strong", "#888a81");
    return;
  }

  if (mode === "paperwhite") {
    root.style.removeProperty("--bg");
    root.style.removeProperty("--bg-beige");
    root.style.removeProperty("--bg-light");
    root.style.removeProperty("--surface");
    root.style.removeProperty("--surface-elevated");
    root.style.removeProperty("--fg");
    root.style.removeProperty("--muted");
    root.style.removeProperty("--border");
    root.style.removeProperty("--border-strong");
    return;
  }

  // Colorsoft / Carta 1200 frontlight + amber LED optical model (0..24 steps)
  const bNorm = Math.max(0, Math.min(24, brightness)) / 24;
  const wNorm = Math.max(0, Math.min(24, warmth)) / 24;

  // Base unlit reflective paper (#dad8cf) -> bright frontlit paper (#f2f0e8) + amber warmth tint
  const baseR = Math.round(218 + bNorm * 24 + wNorm * 6);
  const baseG = Math.round(216 + bNorm * 23 - wNorm * 4);
  const baseB = Math.round(207 + bNorm * 21 - wNorm * 22);

  const clamp = (n: number): number => Math.max(185, Math.min(252, n));
  const r = clamp(baseR);
  const g = clamp(baseG);
  const b = clamp(baseB);

  root.style.setProperty("--bg", `rgb(${r}, ${g}, ${b})`);
  root.style.setProperty("--bg-beige", `rgb(${clamp(r - 9)}, ${clamp(g - 9)}, ${clamp(b - 10)})`);
  root.style.setProperty("--bg-light", `rgb(${clamp(r + 5)}, ${clamp(g + 5)}, ${clamp(b + 4)})`);
  root.style.setProperty("--surface", `rgb(${clamp(r - 6)}, ${clamp(g - 6)}, ${clamp(b - 7)})`);
  root.style.setProperty("--surface-elevated", `rgb(${clamp(r + 7)}, ${clamp(g + 6)}, ${clamp(b + 5)})`);
  root.style.removeProperty("--fg");
  root.style.removeProperty("--muted");
  root.style.removeProperty("--border");
  root.style.removeProperty("--border-strong");
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

  const hlClasses = ["eink-hl-yellow", "eink-hl-blue", "eink-hl-pink", "eink-hl-green", "eink-hl-orange"];
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % words.length;
    el.textContent = words[idx] ?? "";
    hlClasses.forEach((c) => el.classList.remove(c));
    el.classList.add(hlClasses[idx % hlClasses.length] ?? "eink-hl-yellow");
  }, 2800);
}

function initHeroWindowTabs(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".hero-window-tab"));
  const stageImg = document.getElementById("hero-stage-img") as HTMLImageElement | null;
  const stageCaption = document.getElementById("hero-stage-caption");
  const stageTrigger = document.getElementById("hero-stage-trigger");
  const footerIdxEl = document.getElementById("kindle-footer-tab-idx");
  const prevBtn = document.getElementById("btn-oasis-prev");
  const nextBtn = document.getElementById("btn-oasis-next");

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
      triggerWaveformFlash(opticsState.mode === "colorsoft");
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
      const baseText = (footerIdxEl.textContent ?? "").replace(/·\s*\d+\s*\/\s*\d+\s*$/, "").trim();
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

function initKindleQuickShadeAndHardware(): void {
  const shadeToggle = document.getElementById("kindle-shade-toggle");
  const quickShade = document.getElementById("kindle-quick-shade");
  const waveformBtn = document.getElementById("eink-waveform-btn");
  const brightnessSlider = document.getElementById("eink-brightness-slider") as HTMLInputElement | null;
  const warmthSlider = document.getElementById("eink-warmth-slider") as HTMLInputElement | null;
  const brightnessVal = document.getElementById("eink-brightness-val");
  const warmthVal = document.getElementById("eink-warmth-val");
  const clockEl = document.getElementById("kindle-clock");
  const deviceShell = document.getElementById("device-shell");
  const dogEarBtn = document.getElementById("dog-ear-bookmark");

  if (clockEl) {
    const updateClock = (): void => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      clockEl.textContent = `${hh}:${mm}`;
    };
    updateClock();
  }

  if (shadeToggle && quickShade) {
    shadeToggle.addEventListener("click", () => {
      const isHidden = quickShade.hasAttribute("hidden");
      if (isHidden) {
        quickShade.removeAttribute("hidden");
        shadeToggle.setAttribute("aria-expanded", "true");
      } else {
        quickShade.setAttribute("hidden", "");
        shadeToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (waveformBtn) {
    waveformBtn.addEventListener("click", () => {
      triggerWaveformFlash(opticsState.mode === "colorsoft");
    });
  }

  document.querySelectorAll<HTMLButtonElement>("[data-eink-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetMode = (btn.getAttribute("data-eink-mode") ?? "colorsoft") as EInkPanelMode;
      opticsState.mode = targetMode;
      triggerWaveformFlash(targetMode === "colorsoft");
      applyEInkOptics();
    });
  });

  const syncSlidersToOptics = (): void => {
    if (brightnessSlider) opticsState.brightness = Number(brightnessSlider.value);
    if (warmthSlider) opticsState.warmth = Number(warmthSlider.value);
    if (brightnessVal) brightnessVal.textContent = String(opticsState.brightness);
    if (warmthVal) warmthVal.textContent = String(opticsState.warmth);
    if (opticsState.mode !== "colorsoft") {
      opticsState.mode = "colorsoft";
    }
    applyEInkOptics();
  };

  if (brightnessSlider) {
    brightnessSlider.addEventListener("input", syncSlidersToOptics);
  }
  if (warmthSlider) {
    warmthSlider.addEventListener("input", syncSlidersToOptics);
  }

  const presetBtns = document.querySelectorAll<HTMLButtonElement>("[data-eink-preset]");
  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-eink-preset") ?? "16,8";
      const [bStr, wStr] = raw.split(",");
      opticsState.brightness = Number(bStr ?? 16);
      opticsState.warmth = Number(wStr ?? 8);
      opticsState.mode = "colorsoft";
      if (brightnessSlider) brightnessSlider.value = String(opticsState.brightness);
      if (warmthSlider) warmthSlider.value = String(opticsState.warmth);
      if (brightnessVal) brightnessVal.textContent = String(opticsState.brightness);
      if (warmthVal) warmthVal.textContent = String(opticsState.warmth);
      presetBtns.forEach((p) => p.classList.toggle("active", p === btn));
      triggerWaveformFlash(true);
      applyEInkOptics();
    });
  });

  // Kindle Hardware Chassis Switcher (Oasis / Colorsoft / Paperwhite / Frameless)
  const chassisBtns = document.querySelectorAll<HTMLButtonElement>("[data-kindle-chassis]");
  chassisBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const chassis = btn.getAttribute("data-kindle-chassis") ?? "oasis";
      if (deviceShell) {
        deviceShell.classList.remove("chassis-oasis", "chassis-colorsoft", "chassis-paperwhite", "chassis-frameless");
        deviceShell.classList.add(`chassis-${chassis}`);
      }
      chassisBtns.forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-kindle-chassis") === chassis);
      });
      triggerWaveformFlash(chassis === "colorsoft");
    });
  });

  // Kindle Hardware Bezel Finish Switcher (Graphite / Matcha / Denim / Silver)
  const finishBtns = document.querySelectorAll<HTMLButtonElement>("[data-kindle-finish]");
  finishBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const finish = btn.getAttribute("data-kindle-finish") ?? "graphite";
      if (deviceShell) {
        deviceShell.classList.remove("finish-graphite", "finish-matcha", "finish-denim", "finish-silver");
        deviceShell.classList.add(`finish-${finish}`);
      }
      finishBtns.forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-kindle-finish") === finish);
      });
    });
  });

  if (dogEarBtn) {
    dogEarBtn.addEventListener("click", () => {
      dogEarBtn.classList.toggle("bookmarked");
    });
  }
}

function initHorizonShowcase(): void {
  const board = document.getElementById("horizon-board");
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-horizon-step]");
  if (!board || buttons.length === 0) return;

  const updateStep = (step: number, withFlash = false): void => {
    if (withFlash) {
      triggerWaveformFlash(opticsState.mode === "colorsoft");
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
  const filterBtns = document.querySelectorAll<HTMLButtonElement>("[data-gallery-filter]");
  const cards = document.querySelectorAll<HTMLElement>(".screenshot-card[data-shot-category]");
  if (filterBtns.length > 0 && cards.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-gallery-filter") ?? "all";
        triggerWaveformFlash(opticsState.mode === "colorsoft");
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
    triggerWaveformFlash(false);
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
    const nextMode: EInkPanelMode = opticsState.mode === "paperwhite" ? "colorsoft" : "paperwhite";
    opticsState.mode = nextMode;
    triggerWaveformFlash(nextMode === "colorsoft");
    applyEInkOptics();
  });
}

function initAll(): void {
  applyEInkOptics();
  initHeroRotatingWords();
  initHeroWindowTabs();
  initKindleQuickShadeAndHardware();
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
