(function () {
  function hrefId(link) {
    var data = link.getAttribute('data-section');
    if (data) return data;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#') return href.slice(1);
    return href.split('#')[1] || '';
  }

  function headerOffset() {
    var header = document.querySelector('#header-group, .pp-site-header');
    return header ? Math.ceil(header.getBoundingClientRect().height) + 16 : 120;
  }

  function findContent(root) {
    return root.querySelector('main.content, main.page-content, main.faq-main, .content, .page-content, .faq-main') || root;
  }

  function removeFakeProgress() {
    Array.prototype.forEach.call(document.querySelectorAll('.pp-page-progress, .pp-page-progress-rail, .pp-content-rail'), function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function unlockInnerScroll(el) {
    if (!el) return;
    el.classList.remove('pp-content-scroll');
    el.style.maxHeight = 'none';
    el.style.height = 'auto';
    el.style.paddingBottom = '';
    el.style.overflow = 'visible';
    var wrap = el.closest('.pp-content-scroll-wrap');
    if (wrap) {
      wrap.classList.remove('pp-content-scroll-wrap');
    }
  }

  function uniqueSections(root, links) {
    var seen = {};
    var sections = [];
    links.forEach(function (link) {
      var id = hrefId(link);
      if (!id || seen[id]) return;
      var section = root.querySelector('#' + CSS.escape(id));
      if (!section || section.offsetHeight <= 0) return;
      seen[id] = true;
      sections.push(section);
    });
    return sections.sort(function (a, b) {
      return a.offsetTop - b.offsetTop;
    });
  }

  function initPolicyToc(rootSelector) {
    var root = document.querySelector(rootSelector);
    if (!root) return;

    var links = Array.from(root.querySelectorAll('.toc-list a[href^="#"], .toc-list a[data-section], .mobile-toc-list a[href^="#"]'));
    if (!links.length) return;

    removeFakeProgress();

    var tocList = root.querySelector('.toc-list');
    if (tocList) tocList.classList.add('pp-toc-list');
    var tocSidebar = root.querySelector('.toc-sidebar, aside.sidebar, .sidebar');

    var host = findContent(root);
    unlockInnerScroll(host);
    unlockInnerScroll(tocSidebar);

    var sections = uniqueSections(root, links);

    function keepActiveLinkVisible(id) {
      if (!tocList || !tocSidebar) return;
      if (tocSidebar.scrollHeight <= tocSidebar.clientHeight + 1) return;
      var active = tocList.querySelector('a[href="#' + CSS.escape(id) + '"], a[data-section="' + CSS.escape(id) + '"]');
      if (!active) return;
      var sidebarRect = tocSidebar.getBoundingClientRect();
      var linkRect = active.getBoundingClientRect();
      var pad = 8;
      if (linkRect.top < sidebarRect.top + pad) {
        tocSidebar.scrollTop -= sidebarRect.top + pad - linkRect.top;
      } else if (linkRect.bottom > sidebarRect.bottom - pad) {
        tocSidebar.scrollTop += linkRect.bottom - (sidebarRect.bottom - pad);
      }
    }

    function setActive(id) {
      links.forEach(function (link) {
        var match = hrefId(link) === id;
        link.classList.toggle('active', match);
        link.classList.toggle('is-active', match);
      });
      keepActiveLinkVisible(id);
    }

    function ensureLastSectionReachable() {
      if (!host || !sections.length) return;
      var spacer = host.querySelector('.pp-toc-scroll-spacer');
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.className = 'pp-toc-scroll-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        host.appendChild(spacer);
      }
      spacer.style.height = '0px';
      var last = sections[sections.length - 1];
      var lastTop = window.scrollY + last.getBoundingClientRect().top;
      var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      var extra = Math.max(0, Math.ceil(lastTop - headerOffset() - maxScroll));
      spacer.style.height = extra + 'px';
    }

    function updateFromScroll() {
      if (!sections.length) return;
      var offset = headerOffset();
      var doc = document.documentElement;
      var atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 8;
      var current = atBottom ? sections[sections.length - 1] : sections[0];
      if (!atBottom) {
        sections.forEach(function (section) {
          if (section.getBoundingClientRect().top - offset <= 8) current = section;
        });
      }
      if (current) setActive(current.id);
    }

    function scrollToSection(target) {
      var top = window.scrollY + target.getBoundingClientRect().top - headerOffset();
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    function sync() {
      ensureLastSectionReachable();
      updateFromScroll();
    }

    if (sections[0]) setActive(sections[0].id);
    sync();

    window.addEventListener('scroll', updateFromScroll, { passive: true });
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);

    links.forEach(function (link) {
      link.addEventListener('click', function (event) {
        var id = hrefId(link);
        var target = id ? root.querySelector('#' + CSS.escape(id)) : null;
        if (!target) return;
        event.preventDefault();
        ensureLastSectionReachable();
        scrollToSection(target);
        setActive(id);
        if (history.replaceState) {
          history.replaceState(null, '', '#' + id);
        }
      });
    });
  }

  initPolicyToc('.pp-shipping-policy');
  initPolicyToc('.pp-refund-policy');
  initPolicyToc('.pp-privacy-policy');
  initPolicyToc('.pp-terms-of-service');
  initPolicyToc('.pp-faq');
})();
