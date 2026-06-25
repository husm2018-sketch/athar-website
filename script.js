/* ============================================================
   Athar — أثر  |  site interactions
   - language toggle (ar/en) + dir, persisted
   - sticky nav, mobile menu
   - scroll reveal (IntersectionObserver)
   - count-up stats, TOC scrollspy
   ============================================================ */
(function () {
  "use strict";

  const html = document.documentElement;
  const STORE_KEY = "athar-lang";

  /* ---------- language ---------- */
  function applyLang(lang) {
    const isAr = lang === "ar";
    html.setAttribute("data-lang", lang);
    html.setAttribute("lang", lang);
    html.setAttribute("dir", isAr ? "rtl" : "ltr");
    document.title = isAr
      ? html.dataset.titleAr || document.title
      : html.dataset.titleEn || document.title;
    document.querySelectorAll("[data-lang-toggle]").forEach((b) => {
      b.textContent = isAr ? "EN" : "ع";
      b.setAttribute("aria-label", isAr ? "Switch to English" : "التبديل إلى العربية");
    });
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
  }

  function initLang() {
    let lang = "ar";
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === "ar" || saved === "en") lang = saved;
    } catch (e) {}
    applyLang(lang);
    document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyLang(html.getAttribute("data-lang") === "ar" ? "en" : "ar");
      });
    });
  }

  /* ---------- sticky nav ---------- */
  function initNav() {
    const nav = document.querySelector(".nav");
    if (nav) {
      const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    const burger = document.querySelector(".nav-burger");
    const links = document.querySelector(".nav-links");
    if (burger && links) {
      burger.addEventListener("click", () => {
        const open = links.classList.toggle("mobile-open");
        burger.classList.toggle("open", open);
      });
      links.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => {
          links.classList.remove("mobile-open");
          burger.classList.remove("open");
        })
      );
    }
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((e) => io.observe(e));
  }

  /* ---------- count up ---------- */
  function initCount() {
    const nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const dur = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent =
          (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      nums.forEach(run);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            run(en.target);
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    nums.forEach((n) => io.observe(n));
  }

  /* ---------- TOC scrollspy ---------- */
  function initToc() {
    const links = document.querySelectorAll(".toc a");
    if (!links.length) return;
    const map = new Map();
    links.forEach((l) => {
      const id = l.getAttribute("href").slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, l);
    });
    if (!map.size) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            links.forEach((l) => l.classList.remove("active"));
            const a = map.get(en.target);
            if (a) a.classList.add("active");
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    map.forEach((_, sec) => io.observe(sec));
  }

  /* ---------- footer year ---------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach((e) => {
      e.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLang();
    initNav();
    initReveal();
    initCount();
    initToc();
    initYear();
  });
})();
