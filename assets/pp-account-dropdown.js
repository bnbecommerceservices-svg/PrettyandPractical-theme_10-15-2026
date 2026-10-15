document.addEventListener('DOMContentLoaded', () => {
  const dropdowns = document.querySelectorAll('[data-account-dropdown]');

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector('[data-account-dropdown-trigger]');
    const panel = dropdown.querySelector('[data-account-dropdown-panel]');

    if (!trigger || !panel) return;

    let closeTimer;

    const clearCloseTimer = () => {
      if (!closeTimer) return;
      window.clearTimeout(closeTimer);
      closeTimer = null;
    };

    const setExpanded = (isOpen) => {
      dropdown.classList.toggle('is-open', isOpen);
      panel.classList.toggle('is-open', isOpen);
      panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    const close = () => {
      clearCloseTimer();
      setExpanded(false);
      closeTimer = window.setTimeout(() => {
        panel.setAttribute('hidden', '');
      }, 180);
    };

    const open = () => {
      clearCloseTimer();
      panel.removeAttribute('hidden');
      window.requestAnimationFrame(() => {
        setExpanded(true);
      });
    };

    trigger.addEventListener('click', (event) => {
      event.preventDefault();

      if (!panel.classList.contains('is-open')) {
        open();
        return;
      }

      close();
    });

    dropdown.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      close();
      trigger.focus();
    });

    document.addEventListener('click', (event) => {
      if (dropdown.contains(event.target)) return;
      close();
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      open();
      const firstFocusable = panel.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) firstFocusable.focus();
    });
  });
});
