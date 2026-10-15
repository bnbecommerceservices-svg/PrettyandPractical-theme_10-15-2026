(function () {
  var rules = [
    { test: /\/pages\/(?:privacy-policy|privacy)\/?$/i, to: '/policies/privacy-policy' },
    { test: /\/pages\/(?:refund-policy|return-policy|returns|refunds)\/?$/i, to: '/policies/refund-policy' },
    { test: /\/pages\/(?:shipping-policy|shipping)\/?$/i, to: '/policies/shipping-policy' },
    { test: /\/pages\/(?:terms-of-service|terms-and-conditions|terms)\/?$/i, to: '/policies/terms-of-service' },
    { test: /\/pages\/contact-information\/?$/i, to: '/policies/contact-information' }
  ];

  function rewriteHref(href) {
    if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) {
      return href;
    }
    try {
      var url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return href;
      var path = url.pathname.replace(/\/+$/, '') || '/';
      var prefix = '';
      var match = path.match(/^(\/[a-z]{2}(?:-[a-z]{2})?)(\/pages\/.+)$/i);
      var check = path;
      if (match) {
        prefix = match[1];
        check = match[2];
      }
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].test.test(check) || rules[i].test.test(path)) {
          url.pathname = prefix + rules[i].to;
          return url.pathname + url.search + url.hash;
        }
      }
    } catch (err) {}
    return href;
  }

  function rewriteAnchor(anchor) {
    if (!anchor || !anchor.getAttribute) return;
    var href = anchor.getAttribute('href');
    if (!href || href.indexOf('/pages/') === -1) return;
    var next = rewriteHref(href);
    if (next !== href) anchor.setAttribute('href', next);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var links = root.querySelectorAll('a[href*="/pages/"]');
    for (var i = 0; i < links.length; i++) rewriteAnchor(links[i]);
  }

  document.addEventListener(
    'click',
    function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest('a[href*="/pages/"]') : null;
      if (!anchor) return;
      var next = rewriteHref(anchor.href);
      if (next === anchor.href) return;
      event.preventDefault();
      window.location.assign(next);
    },
    true
  );

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      scan(document);
    });
  } else {
    scan(document);
  }
})();
