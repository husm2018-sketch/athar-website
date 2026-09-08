(() => {
  "use strict";

  const SUPPORT_EMAIL = "athar.dev.app@gmail.com";

  document.documentElement.classList.add("js");

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll("[data-support-email]").forEach((element) => {
    element.textContent = SUPPORT_EMAIL;
    if (element instanceof HTMLAnchorElement) {
      element.href = `mailto:${SUPPORT_EMAIL}`;
    }
  });

  document.querySelectorAll("[data-support-subject]").forEach((element) => {
    if (!(element instanceof HTMLAnchorElement)) return;
    const subject = element.dataset.supportSubject || "دعم تطبيق أثر";
    element.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  });

  const menuButton = document.querySelector("[data-menu-button]");
  const siteNav = document.querySelector("[data-site-nav]");

  const isMenuOpen = () =>
    menuButton?.getAttribute("aria-expanded") === "true";

  const closeMenu = ({ returnFocus = false } = {}) => {
    if (!menuButton || !siteNav) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "فتح قائمة التنقل");
    siteNav.dataset.open = "false";
    document.body.classList.remove("menu-open");
    if (returnFocus) menuButton.focus();
  };

  if (menuButton && siteNav) {
    const navLinks = Array.from(siteNav.querySelectorAll("a[href]"));

    menuButton.addEventListener("click", () => {
      const shouldOpen = !isMenuOpen();
      menuButton.setAttribute("aria-expanded", String(shouldOpen));
      menuButton.setAttribute(
        "aria-label",
        shouldOpen ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل"
      );
      siteNav.dataset.open = String(shouldOpen);
      document.body.classList.toggle("menu-open", shouldOpen);
      if (shouldOpen) {
        window.requestAnimationFrame(() => navLinks[0]?.focus());
      }
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 981px)").matches) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (!isMenuOpen()) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ returnFocus: true });
        return;
      }

      if (event.key === "Tab" && navLinks.length > 0) {
        const focusCycle = [menuButton, ...navLinks];
        const currentIndex = focusCycle.indexOf(document.activeElement);
        const direction = event.shiftKey ? -1 : 1;
        const nextIndex =
          currentIndex === -1
            ? 1
            : (currentIndex + direction + focusCycle.length) % focusCycle.length;

        event.preventDefault();
        focusCycle[nextIndex].focus();
      }
    });
  }

  const deletionForm = document.querySelector("[data-delete-form]");
  const reasonInput = document.querySelector("[data-delete-reason]");
  const reasonCounter = document.querySelector("[data-reason-counter]");
  const formStatus = document.querySelector("[data-form-status]");
  const repeatEmailLink = document.querySelector("[data-repeat-email]");

  const updateReasonCounter = () => {
    if (!reasonInput || !reasonCounter) return;
    reasonCounter.textContent = `${reasonInput.value.length}/500`;
  };

  const buildDeletionMailto = () => {
    if (!(deletionForm instanceof HTMLFormElement)) return "";

    const emailField = deletionForm.elements.namedItem("account-email");
    const reasonField = deletionForm.elements.namedItem("deletion-reason");
    const accountEmail =
      emailField instanceof HTMLInputElement ? emailField.value.trim() : "";
    const reason =
      reasonField instanceof HTMLTextAreaElement ? reasonField.value.trim() : "";

    const subject = "طلب حذف حساب أثر";
    const body = [
      "مرحبًا فريق أثر،",
      "",
      "أرغب في بدء طلب حذف حسابي وبياناتي.",
      `البريد المرتبط بالحساب: ${accountEmail}`,
      `السبب (اختياري): ${reason || "لم يُذكر"}`,
      "",
      "أفهم أن تنفيذ الطلب يتطلب التحقق من ملكية الحساب، وأن حذف حساب أثر لا يلغي اشتراك متجر التطبيقات تلقائيًا.",
      "",
      "شكرًا.",
    ].join("\n");

    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  if (reasonInput) {
    reasonInput.addEventListener("input", updateReasonCounter);
    updateReasonCounter();
  }

  if (deletionForm instanceof HTMLFormElement) {
    deletionForm.action = `mailto:${SUPPORT_EMAIL}`;
    deletionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!deletionForm.reportValidity()) return;

      const mailto = buildDeletionMailto();
      if (!mailto) return;

      deletionForm.dataset.prepared = "true";
      if (formStatus) formStatus.hidden = false;
      if (repeatEmailLink instanceof HTMLAnchorElement) {
        repeatEmailLink.href = mailto;
      }

      window.location.href = mailto;
    });
  }
})();
