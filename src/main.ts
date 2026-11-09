// SPDX-License-Identifier: Apache-2.0
// Mixu landing page interactive enhancements (progressive enhancement; works without JS)

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

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initHorizonShowcase();
      initEinkToggle();
    });
  } else {
    initHorizonShowcase();
    initEinkToggle();
  }
}

export {};
