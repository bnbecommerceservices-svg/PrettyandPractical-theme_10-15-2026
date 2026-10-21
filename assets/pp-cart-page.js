(function () {
  function moneyFromSubunits(value, currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || window.Shopify?.currency?.active || 'USD',
      }).format((value || 0) / 100);
    } catch (error) {
      return ((value || 0) / 100).toFixed(2);
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function placeholderSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>';
  }

  function heartSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"></path></svg>';
  }

  function cartSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>';
  }

  function starSvg(isDim) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (isDim ? ' class="dim"' : '') + '><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
  }

  function renderStars(rating) {
    var rounded = Math.round(Number(rating) || 0);
    var html = '<span class="pp-stars" aria-label="Rated ' + escapeHtml(rating) + ' out of 5">';
    for (var i = 1; i <= 5; i += 1) {
      html += starSvg(i > rounded);
    }
    html += '</span>';
    return html;
  }

  function tagList(tags) {
    if (Array.isArray(tags)) {
      return tags.map(function (tag) {
        return String(tag || '').trim().toLowerCase();
      });
    }
    if (typeof tags === 'string' && tags.length) {
      return tags.split(',').map(function (tag) {
        return tag.trim().toLowerCase();
      });
    }
    return [];
  }

  function normalizeProduct(product, options) {
    if (!product || !product.url || !product.title) return null;
    options = options || {};

    var variants = Array.isArray(product.variants) ? product.variants : [];
    var availableVariants = variants.filter(function (variant) {
      return variant && variant.available;
    });
    var firstVariant = availableVariants[0] || variants[0] || null;

    var featuredImage = product.featured_image;
    if (featuredImage && typeof featuredImage === 'object') {
      featuredImage = featuredImage.url || featuredImage.src || featuredImage.featured_image || '';
    }

    var price = typeof product.price === 'number' ? product.price : firstVariant?.price;
    var compareAtPrice = null;
    if (typeof product.compare_at_price === 'number') {
      compareAtPrice = product.compare_at_price;
    } else if (typeof product.compare_at_price_max === 'number') {
      compareAtPrice = product.compare_at_price_max;
    } else if (firstVariant && typeof firstVariant.compare_at_price === 'number') {
      compareAtPrice = firstVariant.compare_at_price;
    }

    var availableVariantCount = availableVariants.length;
    if (!availableVariantCount && typeof product.available_variant_count === 'number') {
      availableVariantCount = product.available_variant_count;
    }
    if (!availableVariantCount && product.available && product.variant_id) {
      availableVariantCount = 1;
    }

    return {
      title: product.title,
      url: product.url,
      type: product.type || '',
      vendor: product.vendor || '',
      featured_image: featuredImage || '',
      price: price || 0,
      compare_at_price: compareAtPrice,
      currency: product.currency,
      available: Boolean(product.available),
      variant_id: firstVariant ? firstVariant.id : null,
      variant_count: typeof product.variant_count === 'number' ? product.variant_count : variants.length,
      available_variant_count: availableVariantCount,
      rating: typeof product.rating === 'number' ? product.rating : null,
      rating_count: typeof product.rating_count === 'number' ? product.rating_count : null,
      has_sale: typeof compareAtPrice === 'number' && compareAtPrice > price,
    };
  }

  function buildQuickAdd(product) {
    if (!product.available || !product.variant_id || product.available_variant_count !== 1) return '';
    return (
      '<form class="pp-quickadd" data-pp-quickadd-form>' +
        '<input type="hidden" name="id" value="' + escapeHtml(product.variant_id) + '">' +
        '<input type="hidden" name="quantity" value="1">' +
        '<button type="submit" aria-label="Add ' + escapeHtml(product.title) + ' to cart">' +
          cartSvg() +
          '<span data-quickadd-label>Add to cart</span>' +
        '</button>' +
      '</form>'
    );
  }

  function buildCard(product) {
    var category = product.type || product.vendor || '';
    var showSale = Boolean(product.has_sale);
    var badgesHtml = '';
    if (showSale) {
      badgesHtml = '<div class="pp-card__badges">';
      if (showSale) badgesHtml += '<span class="pp-pill pp-pill--sale">Sale</span>';
      badgesHtml += '</div>';
    }

    var imageHtml = product.featured_image
      ? '<img src="' + escapeHtml(product.featured_image) + '" alt="' + escapeHtml(product.title) + '" loading="lazy">'
      : '<div class="pp-card__placeholder">' + placeholderSvg() + '<span>' + escapeHtml(product.title) + '</span></div>';

    var ratingHtml = '';
    if (typeof product.rating === 'number' && typeof product.rating_count === 'number' && product.rating_count > 0) {
      ratingHtml =
        '<div class="pp-card__rating">' +
          renderStars(product.rating) +
          '<span class="pp-card__count">(' + escapeHtml(product.rating_count) + ')</span>' +
        '</div>';
    }

    var priceHtml =
      '<div class="pp-card__price">' +
        '<span class="pp-price' + (showSale ? ' pp-price--sale' : '') + '">' + moneyFromSubunits(product.price, product.currency) + '</span>' +
        (showSale ? '<span class="pp-price__was">' + moneyFromSubunits(product.compare_at_price, product.currency) + '</span>' : '') +
      '</div>';

    return (
      '<article class="pp-card">' +
        '<div class="pp-card__image">' +
          badgesHtml +
          '<button type="button" class="pp-wishlist" aria-label="Save ' + escapeHtml(product.title) + '">' +
            heartSvg() +
          '</button>' +
          '<a href="' + escapeHtml(product.url) + '" class="pp-card__image-inner" aria-label="' + escapeHtml(product.title) + '">' + imageHtml + '</a>' +
          buildQuickAdd(product) +
        '</div>' +
        '<div class="pp-card__body">' +
          (category ? '<p class="pp-card__cat">' + escapeHtml(category) + '</p>' : '') +
          '<h3 class="pp-card__title"><a href="' + escapeHtml(product.url) + '">' + escapeHtml(product.title) + '</a></h3>' +
          ratingHtml +
          priceHtml +
        '</div>' +
      '</article>'
    );
  }

  function parseFallbackProducts(section, options) {
    var script = section.querySelector('[data-pp-cart-fallback-products]');
    if (!script) return [];
    try {
      var parsed = JSON.parse(script.textContent || '[]');
      return Array.isArray(parsed)
        ? parsed.map(function (product) { return normalizeProduct(product, options); }).filter(Boolean)
        : [];
    } catch (error) {
      return [];
    }
  }

  function renderProducts(section, products) {
    var grid = section.querySelector('#recommend-grid');
    if (!grid) return false;
    if (!products.length) {
      grid.innerHTML = '';
      section.hidden = true;
      return false;
    }

    grid.innerHTML = products.slice(0, 4).map(buildCard).join('');
    section.hidden = false;
    return true;
  }

  function mergeProducts(primaryProducts, fallbackProducts) {
    var merged = [];
    var seen = new Set();

    function pushProducts(list) {
      list.forEach(function (product) {
        if (!product || merged.length >= 4) return;
        var key = product.url || product.title;
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(product);
      });
    }

    pushProducts(primaryProducts || []);
    pushProducts(fallbackProducts || []);
    return merged;
  }

  function fetchRecommendations(section, ids, options) {
    var baseUrl = section.dataset.baseUrl || '';
    if (!baseUrl || !ids.length) return Promise.resolve([]);

    return ids.reduce(function (promise, id) {
      return promise.then(function (collected) {
        if (collected.length >= 4) return collected;

        var url = baseUrl + '.json?product_id=' + encodeURIComponent(id) + '&limit=4&intent=related';
        return fetch(url, { credentials: 'same-origin' })
          .then(function (response) {
            if (!response.ok) throw new Error('Failed to load recommendations');
            return response.json();
          })
          .then(function (data) {
            var products = Array.isArray(data.products)
              ? data.products.map(function (product) { return normalizeProduct(product, options); }).filter(Boolean)
              : [];
            return mergeProducts(collected, products);
          })
          .catch(function () {
            return collected;
          });
      });
    }, Promise.resolve([]));
  }

  function initSection(section) {
    if (!(section instanceof HTMLElement) || section.dataset.ppCartRecommendationsReady === 'true') return;
    section.dataset.ppCartRecommendationsReady = 'true';

    var ids = (section.dataset.productIds || '')
      .split(',')
      .map(function (value) { return value.trim(); })
      .filter(Boolean);
    var options = {};
    var fallbackProducts = parseFallbackProducts(section, options);

    fetchRecommendations(section, ids, options).then(function (products) {
      renderProducts(section, mergeProducts(products, fallbackProducts));
    });
  }

  function initAll(root) {
    var scope = root instanceof Element || root instanceof Document ? root : document;
    scope.querySelectorAll('[data-pp-cart-recommendations]').forEach(initSection);
  }

  document.addEventListener('click', function (event) {
    var wishlistButton = event.target.closest('.pp-wishlist');
    if (wishlistButton) {
      event.preventDefault();
      event.stopPropagation();
      wishlistButton.classList.toggle('is-active');
    }
  });

  document.addEventListener('submit', function (event) {
    var quickAddForm = event.target.closest('[data-pp-quickadd-form]');
    if (!quickAddForm) return;

    event.preventDefault();
    event.stopPropagation();

    var submitButton = quickAddForm.querySelector('button[type="submit"]');
    var label = quickAddForm.querySelector('[data-quickadd-label]');
    if (!(submitButton instanceof HTMLButtonElement)) return;

    submitButton.disabled = true;
    quickAddForm.classList.add('is-added');
    if (label) label.textContent = 'Added';

    fetch((window.Shopify?.routes?.root || '/') + 'cart/add.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
      },
      body: new FormData(quickAddForm),
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Quick add failed');
        return response.json();
      })
      .then(function () {
        window.location.reload();
      })
      .catch(function () {
        quickAddForm.classList.remove('is-added');
        submitButton.disabled = false;
        if (label) label.textContent = 'Add to cart';
      });
  });

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
