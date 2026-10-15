(function () {
  var root = document.querySelector('.pp-shipping-policy');

  if (!root) return;

  var tocLinks = root.querySelectorAll('#toc-list a[data-section]');
  var sectionIds = Array.from(tocLinks).map(function (link) {
    return link.dataset.section;
  });
  var sections = sectionIds.map(function (id) {
    return root.querySelector('#' + id);
  }).filter(Boolean);

  if (!sections.length || !tocLinks.length) return;

  function setActive(id) {
    tocLinks.forEach(function (link) {
      link.classList.toggle('active', link.dataset.section === id);
    });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        setActive(entry.target.id);
      }
    });
  }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });

  sections.forEach(function (section) {
    observer.observe(section);
  });

  tocLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      var targetId = this.dataset.section;
      var target = root.querySelector('#' + targetId);

      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(targetId);
    });
  });
}());
