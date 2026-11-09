(function () {
  if (window.matchMedia('(max-width: 768px)').matches) return;

  var rail = document.createElement('div');
  rail.className = 'pp-page-scroll-rail';
  rail.setAttribute('aria-hidden', 'true');
  var thumb = document.createElement('span');
  thumb.className = 'pp-page-scroll-rail__thumb';
  rail.appendChild(thumb);
  document.body.appendChild(rail);

  function update() {
    var view = window.innerHeight;
    var total = document.documentElement.scrollHeight;
    if (total <= view + 1) {
      rail.style.opacity = '0';
      return;
    }
    rail.style.opacity = '1';
    var thumbHeight = Math.max(32, (view / total) * view);
    var max = total - view;
    var top = (window.scrollY / max) * (view - thumbHeight);
    // Window sizes are on-screen pixels; divide by the small-screen zoom to get CSS pixels.
    var zoom = window.ppZoom ? window.ppZoom() : 1;
    thumb.style.height = thumbHeight / zoom + 'px';
    thumb.style.transform = 'translateY(' + top / zoom + 'px)';
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
