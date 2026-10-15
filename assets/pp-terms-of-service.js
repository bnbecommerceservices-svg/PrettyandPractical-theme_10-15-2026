(function () {
  'use strict';

  var root = document.querySelector('.pp-terms-of-service');
  if (!root) return;

  root.querySelectorAll('.toc-link, .mobile-toc-list a').forEach(function (link) {
    link.addEventListener('click', function () {
      var mobileToc = root.querySelector('.mobile-toc');
      if (mobileToc) mobileToc.open = false;
    });
  });
}());
