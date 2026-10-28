(function () {
  // Wishlist page: shows each saved product (window.PPWishlist, stored in the
  // browser) as the collection page card, fetched from the
  // sections/pp-wishlist-card.liquid section on the product's own URL.
  var MORE_CARDS = 4;
  var cardCache = {};

  function productPath(item) {
    if (item.handle) {
      var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      return root + 'products/' + encodeURIComponent(item.handle);
    }
    return item.url ? item.url.split('?')[0] : '';
  }

  function loadCard(item) {
    var key = item.handle || item.id;
    if (!cardCache[key]) {
      var path = productPath(item);
      cardCache[key] = !path
        ? Promise.resolve(null)
        : fetch(path + '?section_id=pp-wishlist-card', { credentials: 'same-origin' })
            .then(function (response) {
              return response.ok ? response.text() : '';
            })
            .then(function (html) {
              var doc = new DOMParser().parseFromString(html, 'text/html');
              return doc.querySelector('[data-pp-wishlist-card] .pp-card');
            })
            .catch(function () {
              return null;
            });
    }
    return cardCache[key];
  }

  function skeletons(count) {
    var nodes = [];
    for (var i = 0; i < count; i++) {
      var node = document.createElement('div');
      node.className = 'pp-wishlist-skeleton';
      node.innerHTML = '<span></span><span></span><span></span>';
      nodes.push(node);
    }
    return nodes;
  }

  function boot() {
    var root = document.querySelector('[data-pp-wishlist-page]');
    if (!root || !window.PPWishlist) return false;
    if (root.dataset.ppWishlistPageBound === 'true') return true;
    root.dataset.ppWishlistPageBound = 'true';

    var grid = root.querySelector('[data-pp-wishlist-grid]');
    var empty = root.querySelector('[data-pp-wishlist-empty]');
    var clearBtn = root.querySelector('[data-pp-wishlist-clear]');
    var summary = root.querySelector('[data-pp-wishlist-summary]');
    var moreCards = Array.prototype.slice.call(root.querySelectorAll('[data-pp-wishlist-more-grid] .pp-card'));
    var renderId = 0;

    function setCount(total) {
      if (summary) {
        summary.hidden = total === 0;
        summary.innerHTML = '<strong>' + total + '</strong> ' + (total === 1 ? 'saved item' : 'saved items');
      }
      if (clearBtn) clearBtn.hidden = total === 0;
      empty.hidden = total !== 0;
      grid.hidden = total === 0;
    }

    // "You might also like": the first products that aren't already saved.
    function syncMore(list) {
      var shown = 0;
      moreCards.forEach(function (card) {
        var id = card.dataset.productId;
        var saved = list.some(function (item) {
          return item.id === id;
        });
        var show = !saved && shown < MORE_CARDS;
        if (show) shown += 1;
        card.hidden = !show;
      });
    }

    function render(items) {
      var list = Array.isArray(items) ? items : window.PPWishlist.getAll();
      var id = ++renderId;

      syncMore(list);
      window.PPWishlist.updateHeaderCount();

      if (!list.length) {
        grid.replaceChildren();
        setCount(0);
        return;
      }

      if (!grid.children.length) {
        grid.replaceChildren.apply(grid, skeletons(list.length));
      }
      setCount(list.length);
      grid.setAttribute('aria-busy', 'true');

      Promise.all(list.map(loadCard)).then(function (cards) {
        if (id !== renderId) return;
        var nodes = cards.filter(Boolean).map(function (card) {
          return document.importNode(card, true);
        });
        grid.replaceChildren.apply(grid, nodes);
        grid.removeAttribute('aria-busy');
        window.PPWishlist.bindButtons(grid);
        setCount(nodes.length);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        window.PPWishlist.clear();
      });
    }

    render(window.PPWishlist.getAll());
    window.PPWishlist.subscribe(render);
    return true;
  }

  function start() {
    if (boot()) return;
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (boot() || tries > 40) window.clearInterval(timer);
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
