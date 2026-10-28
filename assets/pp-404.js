(function () {
  // Tilts the 3D "404" hero towards the pointer on devices with a mouse.
  var hero = document.querySelector('[data-pp-404-hero]');

  if (!hero || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var frame = 0;

  document.addEventListener('pointermove', function (event) {
    if (frame) {
      return;
    }

    frame = requestAnimationFrame(function () {
      frame = 0;
      var rect = hero.getBoundingClientRect();
      var x = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
      var y = (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
      hero.style.setProperty('--ry', (x * 24).toFixed(2) + 'deg');
      hero.style.setProperty('--rx', (y * -16).toFixed(2) + 'deg');
    });
  });

  document.documentElement.addEventListener('pointerleave', function () {
    hero.style.setProperty('--ry', '0deg');
    hero.style.setProperty('--rx', '0deg');
  });
})();
