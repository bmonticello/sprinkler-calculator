(function () {
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  };

  onReady(() => {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("primary-nav");
    const overlay = document.getElementById("navOverlay");
    const firstNavLink = nav?.querySelector("a");
    let lastFocused = null;

    const openMenu = () => {
      if (!toggle || !nav) return;
      lastFocused = document.activeElement;
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
      overlay && overlay.removeAttribute("hidden");
      // Move focus into the menu (first link)
      if (firstNavLink) firstNavLink.focus({ preventScroll: true });
    };

    const closeMenu = () => {
      if (!toggle || !nav) return;
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
      overlay && overlay.setAttribute("hidden", "");
      // Return focus to the toggle
      if (lastFocused && lastFocused instanceof HTMLElement) {
        lastFocused.focus({ preventScroll: true });
      } else {
        toggle.focus({ preventScroll: true });
      }
    };

    const toggleMenu = () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      expanded ? closeMenu() : openMenu();
    };

    // Bind events
    toggle?.addEventListener("click", toggleMenu);

    overlay?.addEventListener("click", () => {
      closeMenu();
    });

    // Close on Esc
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const expanded = toggle?.getAttribute("aria-expanded") === "true";
        if (expanded) {
          e.preventDefault();
          closeMenu();
        }
      }
    });

    // Close when a nav link is clicked (mobile)
    nav?.addEventListener("click", (e) => {
      const target = e.target;
      if (target && target.closest("a")) {
        const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
        if (isMobile) closeMenu();
      }
    });

    // Add scrolled class for shadow/shrink
    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 4) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Improve aria-current if paths match (best-effort)
    try {
      const links = nav?.querySelectorAll("a[href]");
      const loc = window.location;
      links?.forEach((a) => {
        const href = a.getAttribute("href");
        if (!href) return;
        // Normalize trailing slash for home
        const isHome = href === "/" || href.endsWith("/index.html");
        const onHome =
          loc.pathname === "/" ||
          loc.pathname.endsWith("/index.html");
        if (isHome && onHome) {
          a.setAttribute("aria-current", "page");
          return;
        }
        // For other pages, exact end match
        if (href !== "/" && loc.pathname.endsWith(href)) {
          a.setAttribute("aria-current", "page");
        }
      });
    } catch (_) {
      /* noop */
    }
  });
})();
