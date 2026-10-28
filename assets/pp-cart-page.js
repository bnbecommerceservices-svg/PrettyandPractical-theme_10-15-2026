(function () {
  // Cart page "You may also like": up to 4 collection page cards. Related
  // products for the cart items come from the sections/pp-rec-cards.liquid
  // Section Rendering API; the recommendations collection fills any gaps.
  var MAX_CARDS = 4;

  function cardsFromHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.prototype.slice.call(doc.querySelectorAll('[data-pp-rec-results] .pp-card'));
  }

  function fallbackCards(section) {
    var template = section.querySelector('[data-pp-cart-fallback-cards]');
    if (!(template instanceof HTMLTemplateElement)) return [];
    return Array.prototype.slice.call(template.content.querySelectorAll('.pp-card'));
  }

  function mergeCards(collected, cards, excludedIds) {
    var seen = new Set(
      collected.map(function (card) {
        return card.dataset.productId;
      })
    );
    cards.forEach(function (card) {
      var id = card.dataset.productId;
      if (collected.length >= MAX_CARDS || !id || seen.has(id) || excludedIds.has(id)) return;
      seen.add(id);
      collected.push(card);
    });
    return collected;
  }

  function fetchRecommendations(section, ids, excludedIds) {
    var baseUrl = section.dataset.baseUrl || '';
    if (!baseUrl || !ids.length) return Promise.resolve([]);

    return ids.reduce(function (promise, id) {
      return promise.then(function (collected) {
        if (collected.length >= MAX_CARDS) return collected;

        var url = baseUrl + '?product_id=' + encodeURIComponent(id) + '&limit=8&intent=related&section_id=pp-rec-cards';
        return fetch(url, { credentials: 'same-origin' })
          .then(function (response) {
            if (!response.ok) throw new Error('Failed to load recommendations');
            return response.text();
          })
          .then(function (html) {
            return mergeCards(collected, cardsFromHtml(html), excludedIds);
          })
          .catch(function () {
            return collected;
          });
      });
    }, Promise.resolve([]));
  }

  function renderCards(section, cards) {
    var grid = section.querySelector('#recommend-grid');
    if (!grid) return;
    if (!cards.length) {
      grid.replaceChildren();
      section.hidden = true;
      return;
    }

    grid.replaceChildren.apply(
      grid,
      cards.map(function (card) {
        return document.importNode(card, true);
      })
    );
    section.hidden = false;
  }

  function initSection(section) {
    if (!(section instanceof HTMLElement) || section.dataset.ppCartRecommendationsReady === 'true') return;
    section.dataset.ppCartRecommendationsReady = 'true';

    var ids = (section.dataset.productIds || '')
      .split(',')
      .map(function (value) {
        return value.trim();
      })
      .filter(Boolean);
    var excludedIds = new Set(ids);

    fetchRecommendations(section, ids, excludedIds).then(function (cards) {
      renderCards(section, mergeCards(cards, fallbackCards(section), excludedIds));
    });
  }

  function initAll(root) {
    var scope = root instanceof Element || root instanceof Document ? root : document;
    scope.querySelectorAll('[data-pp-cart-recommendations]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (!(node instanceof Element)) return;
        if (node.matches('[data-pp-cart-recommendations]')) initSection(node);
        initAll(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
