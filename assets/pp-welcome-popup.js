(function () {
  var root = document.getElementById('ppWelcomePopup');
  if (!root) return;

  var storageKey = 'pp-welcome-popup-v2';
  var offer = root.querySelector('[data-welcome-offer]');
  var done = root.querySelector('[data-welcome-done]');
  var codeEl = root.querySelector('[data-welcome-code]');
  var copyBtn = root.querySelector('[data-welcome-copy]');
  var form = root.querySelector('#ppWelcomeForm');
  var posted = Boolean(root.querySelector('[data-welcome-posted]'));
  var subscribed = root.getAttribute('data-welcome-subscribed') === 'true';
  var inEditor = document.documentElement.classList.contains('shopify-design-mode');

  function readState() {
    try {
      return window.localStorage.getItem(storageKey) || '';
    } catch (error) {
      return '';
    }
  }

  function remember(state) {
    try {
      window.localStorage.setItem(storageKey, state);
    } catch (error) {}
  }

  function alreadyDone() {
    var state = readState();
    return state === 'joined' || state === 'dismissed' || Boolean(state);
  }

  function showSuccess() {
    root.classList.add('is-success');
    if (offer) offer.hidden = true;
    if (done) done.hidden = false;
  }

  function openPopup() {
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var focusEl = root.querySelector('#ppWelcomeEmail') || root.querySelector('[data-welcome-close]');
    if (focusEl) focusEl.focus();
  }

  function closePopup(state) {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (state) remember(state);
    else if (readState() !== 'joined') remember('dismissed');
  }

  root.querySelectorAll('[data-welcome-close]').forEach(function (el) {
    el.addEventListener('click', function () {
      closePopup(readState() === 'joined' ? 'joined' : 'dismissed');
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !root.hidden) {
      closePopup(readState() === 'joined' ? 'joined' : 'dismissed');
    }
  });

  if (form) {
    form.addEventListener('submit', function () {
      remember('joined');
    });
  }

  if (copyBtn && codeEl) {
    copyBtn.addEventListener('click', function () {
      var code = codeEl.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () {
          copyBtn.textContent = 'Copied';
          window.setTimeout(function () {
            copyBtn.textContent = 'Copy';
          }, 1600);
        });
      }
    });
  }

  if (posted) {
    remember('joined');
    showSuccess();
    openPopup();
    return;
  }

  var isHome = window.location.pathname === '/' || window.location.pathname === '';
  if (!inEditor && (subscribed || alreadyDone() || !isHome)) return;

  window.setTimeout(openPopup, inEditor ? 400 : 1400);
})();
