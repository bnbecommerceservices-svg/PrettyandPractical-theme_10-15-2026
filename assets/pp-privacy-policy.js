(function () {
  var root = document.querySelector('.pp-privacy-policy');
  if (!root) return;

  var mobileDetails = root.querySelector('.mobile-toc details');
  root.querySelectorAll('.mobile-toc-list a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (mobileDetails) mobileDetails.removeAttribute('open');
    });
  });
}());
