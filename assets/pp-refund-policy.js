(function () {
  var root = document.querySelector('.pp-refund-policy');
  if (!root) return;

  var jumpLinks = root.querySelectorAll('.mobile-jump-list a');
  var jumpDetails = root.querySelector('.mobile-jump');

  jumpLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      if (jumpDetails) jumpDetails.removeAttribute('open');
    });
  });
}());
