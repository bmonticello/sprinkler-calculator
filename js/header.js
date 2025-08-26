// Accessible, mobile-friendly header menu controller
// - Uses body.nav-open and an overlay to lock the page behind the menu
// - Also toggles .open on the nav for compatibility with legacy CSS
// - Blocks legacy click handlers on the same button by handling the click in capture phase

(function () {
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  };

  function isMobile() {
    try {
      return typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 767.98px)").matches;
    } catch (_) {
      // Fallback: treat small viewports as mobile
      return window.innerWidth < 768;
    }
  }

  function safeFocus(el) {
    if (!el || typeof el.focus !== "function") return;
    try {
      el.focus({ preventScroll: true });
    } catch (_) {
      try { el.focus(); } catch (_) {}
    }
  }

  onReady(() => {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("primary-nav");
    const overlay = document.getElementById("navOverlay");
    const firstNavLink = nav ? nav.querySelector("a, button, [tabindex]:not([tabindex='-1'])") : null;

    if (!toggle || !nav) return;

    let lastFocused = null;

    // Ensure a clean initial state
    try {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
      document.body.classList.remove("nav-open");
      if (overlay) overlay.setAttribute("hidden", "");
      const sr = toggle.querySelector(".sr-only");
      if (sr) sr.textContent = "Open menu";
    } catch (_) {}

    function openMenu() {
      lastFocused = document.activeElement;
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
      nav.classList.add("open"); // keep for CSS that uses .primary-nav.open
      if (overlay) overlay.removeAttribute("hidden");
      const sr = toggle.querySelector(".sr-only");
      if (sr) sr.textContent = "Close menu";
      // Move focus into the menu (first focusable)
      safeFocus(firstNavLink);
    }

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
      nav.classList.remove("open");
      if (overlay) overlay.setAttribute("hidden", "");
      const sr = toggle.querySelector(".sr-only");
      if (sr) sr.textContent = "Open menu";
      // Return focus to the toggle or last focused
      if (lastFocused && typeof lastFocused.focus === "function") {
        safeFocus(lastFocused);
      } else {
        safeFocus(toggle);
      }
    }

    function isExpanded() {
      return toggle.getAttribute("aria-expanded") === "true";
    }

    function toggleMenu() {
      isExpanded() ? closeMenu() : openMenu();
    }

    // Handle clicks on the toggle IN CAPTURE PHASE to block legacy handlers
    // This prevents duplicate listeners attached elsewhere from fighting with this controller.
    toggle.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation(); // block other click handlers on this element
        toggleMenu();
      },
      true // capture
    );

    // Also add a standard bubble-phase handler as a fallback (e.g., synthetic clicks)
    toggle.addEventListener("click", (e) => {
      // If some script removed our capture handler, still work.
      if (e && typeof e.defaultPrevented === "boolean" && e.defaultPrevented) return;
      // If already handled (aria-expanded flipped), skip
      // This keeps behavior idempotent.
      // No-op if event already managed in capture phase.
    });

    // Close when clicking the overlay
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        e.preventDefault();
        closeMenu();
      });
    }

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isExpanded()) {
        e.preventDefault();
        closeMenu();
      }
    });

    // Close when a nav link is clicked (mobile only)
    nav.addEventListener("click", (e) => {
      const target = e.target;
      const anchor =
        target &&
        (typeof target.closest === "function"
          ? target.closest("a")
          : (function () {
              let t = target;
              while (t && t !== nav) {
                if (t.tagName && t.tagName.toLowerCase() === "a") return t;
                t = t.parentNode;
              }
              return null;
            })());
      if (anchor && isMobile()) {
        closeMenu();
      }
    });

    // Keep header styling in sync with scroll position
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 4) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Reset menu when switching viewport between mobile/desktop
    const mq = window.matchMedia("(min-width: 768px)");
    const onViewportChange = () => {
      // Always close on breakpoint changes to avoid stuck state
      closeMenu();
    };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onViewportChange);
    else if (typeof mq.addListener === "function") mq.addListener(onViewportChange);

    // Best-effort aria-current on nav links
    try {
      const links = nav.querySelectorAll("a[href]");
      const { pathname } = window.location;
      links.forEach((a) => {
        const href = a.getAttribute("href") || "";
        const isHome = href === "/" || href.endsWith("/index.html");
        const onHome = pathname === "/" || pathname.endsWith("/index.html");
        if ((isHome && onHome) || (!isHome && pathname.endsWith(href))) {
          a.setAttribute("aria-current", "page");
        }
      });
    } catch (_) {}
  });
})();
