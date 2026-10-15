(function () {
  var glow = document.querySelector('.pp-scroll-glow');
  if (!glow) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    glow.hidden = true;
    return;
  }
  var ticking = false;
  function updateGlow() {
    ticking = false;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var progress = Math.min(1, Math.max(0, window.scrollY / max));
    var travel = window.innerHeight * 0.62;
    glow.style.setProperty('--pp-glow-y', (window.innerHeight * 0.14 + progress * travel) + 'px');
    glow.style.setProperty('--pp-glow-shift', ((progress - 0.5) * 36) + 'px');
  }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateGlow);
  }, { passive: true });
  updateGlow();
})();
