document.querySelectorAll('.pp-faq .accordion-button').forEach(function(button) {
  button.addEventListener('click', function() {
    var isExpanded = this.getAttribute('aria-expanded') === 'true';
    var answerId = this.getAttribute('aria-controls');
    var answer = document.getElementById(answerId);

    if (!answer) {
      return;
    }

    if (isExpanded) {
      this.setAttribute('aria-expanded', 'false');
      answer.classList.remove('is-open');
    } else {
      this.setAttribute('aria-expanded', 'true');
      answer.classList.add('is-open');
    }
  });
});
