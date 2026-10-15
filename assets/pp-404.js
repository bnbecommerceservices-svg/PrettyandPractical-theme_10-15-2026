(function () {
  var root = document.querySelector('.pp-404');

  if (!root) {
    return;
  }

  var form = root.querySelector('.pp-404__search');
  var iconButton = root.querySelector('#searchIcon');
  var submitButton = root.querySelector('#searchSubmit');
  var pills = root.querySelectorAll('.pp-404__pill');

  if (!form) {
    return;
  }

  function submitSearch() {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }

    form.submit();
  }

  if (iconButton) {
    iconButton.addEventListener('click', submitSearch);
  }

  if (submitButton) {
    submitButton.addEventListener('click', submitSearch);
  }

  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var destination = pill.getAttribute('data-url');

      if (destination) {
        window.location.href = destination;
      }
    });
  });
})();
