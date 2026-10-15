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
    thumb.style.height = thumbHeight + 'px';
    thumb.style.transform = 'translateY(' + top + 'px)';
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
