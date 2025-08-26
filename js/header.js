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
    const firstNavLink = nav ? nav.querySelector("a") : null;
    let lastFocused = null;

    const safeFocus = (el) => {
      if (!el) return;
      try {
        el.focus({ preventScroll: true });
      } catch (_) {
        try {
          el.focus();
        } catch (_) {
          /* no-op */
        }
      }
    };

    const openMenu = () => {
      if (!toggle || !nav) return;
      lastFocused = document.activeElement;
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
      if (overlay) overlay.removeAttribute("hidden");
      // Move focus into the menu (first link)
      safeFocus(firstNavLink);
    };

    const closeMenu = () => {
      if (!toggle || !nav) return;
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
      if (overlay) overlay.setAttribute("hidden", "");
      // Return focus to the toggle (or last focused element)
      if (lastFocused && typeof lastFocused.focus === "function") {
        safeFocus(lastFocused);
      } else {
        safeFocus(toggle);
      }
    };

    const toggleMenu = () => {
      const expanded = toggle && toggle.getAttribute("aria-expanded") === "true";
      expanded ? closeMenu() : openMenu();
    };

    // Bind events
    if (toggle) {
      toggle.addEventListener("click", toggleMenu);
    }

    if (overlay) {
      overlay.addEventListener("click", () => {
        closeMenu();
      });
    }

    // Close on Esc
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const expanded = toggle && toggle.getAttribute("aria-expanded") === "true";
        if (expanded) {
          e.preventDefault();
          closeMenu();
        }
      }
    });

    // Close when a nav link is clicked (mobile)
    if (nav) {
      nav.addEventListener("click", (e) => {
        let target = e.target;
        // Fallback for browsers without Element.closest
        const isAnchor =
          target &&
          (typeof target.closest === "function"
            ? target.closest("a")
            : (function () {
                while (target && target !== nav) {
                  if (target.tagName && target.tagName.toLowerCase() === "a") return true;
                  target = target.parentNode;
                }
                return false;
              })());

        if (isAnchor) {
          const isMobile =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(max-width: 767.98px)").matches;
          if (isMobile) closeMenu();
        }
      });
    }

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
      const links = nav ? nav.querySelectorAll("a[href]") : null;
      const loc = window.location;

      const setAria = (a) => {
        const href = a.getAttribute("href");
        if (!href) return;
        // Normalize trailing slash for home
        const isHome = href === "/" || href.slice(-11) === "/index.html";
        const onHome = loc.pathname === "/" || loc.pathname.slice(-11) === "/index.html";
        if (isHome && onHome) {
          a.setAttribute("aria-current", "page");
          return;
        }
        // For other pages, exact end match
        if (href !== "/" && loc.pathname.slice(-href.length) === href) {
          a.setAttribute("aria-current", "page");
        }
      };

      if (links) {
        if (typeof links.forEach === "function") {
          links.forEach(setAria);
        } else {
          Array.prototype.forEach.call(links, setAria);
        }
      }
    } catch (_) {
      /* noop */
    }
  });
})();
