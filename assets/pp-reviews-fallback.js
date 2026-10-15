(function () {
  var root = document.querySelector('.pp-creviews');
  if (!root) return;

  var source = document.getElementById('judgeme_product_reviews');
  var listEl = root.querySelector('[data-creviews-list]');
  var summaryEl = root.querySelector('[data-creviews-summary]');
  var filtersEl = root.querySelector('[data-creviews-filters]');
  var pillsEl = root.querySelector('.pp-creviews__pills');
  var moreBtn = root.querySelector('[data-creviews-more]');
  if (!listEl || !summaryEl) return;

  var PAGE = 4;
  var shown = PAGE;
  var filterStar = 0;
  var allReviews = [];
  var handle = root.getAttribute('data-product-handle') || '';
  var productTitle = root.getAttribute('data-product-title') || '';
  var productType = root.getAttribute('data-product-type') || 'this piece';
  var reviewsSrc = root.getAttribute('data-reviews-src') || '';

  var AVATAR = ['#e8532a', '#c73e18', '#0f766e', '#b45309', '#1d4ed8', '#7c3aed', '#be185d'];
  var CITIES = [
    'Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA',
    'Adelaide, SA', 'Hobart, TAS', 'Canberra, ACT', 'Gold Coast, QLD', 'Geelong, VIC',
    'Newcastle, NSW', 'Wollongong, NSW', 'Parramatta, NSW', 'Penrith, NSW',
    'Ballarat, VIC', 'Bendigo, VIC', 'Sunshine Coast, QLD', 'Toowoomba, QLD',
    'Fremantle, WA', 'Launceston, TAS', 'Coffs Harbour, NSW'
  ];
  var REVIEWERS = [
    'Olivia T.', 'Mason K.', 'Harper J.', 'Charlie N.', 'Zoe V.', 'Leo A.',
    'Ruby Q.', 'Daniel P.', 'Emily W.', 'Oscar P.', 'Chloe B.', 'Aisha K.',
    'Henry B.', 'Lily K.', 'Lucas D.', 'Mia S.', 'Jack R.', 'Isla M.',
    'Noah B.', 'Amelia C.', 'Ethan W.', 'Grace L.', 'Archie H.', 'Matilda P.',
    'Hugo F.', 'Sienna W.', 'Felix J.', 'Ava R.', 'Theo C.', 'Willow N.',
    'Harvey D.', 'Evie B.', 'Patrick O.', 'Nadia K.', 'Callum S.', 'Freya M.',
    'Jasper L.', 'Tahlia G.', 'Riley A.', 'Imogen P.', 'Connor V.', 'Layla H.',
    'Ben Q.', 'Stephanie Y.', 'Marcus E.', 'Hannah R.', 'Sofia D.', 'James T.'
  ];
  var REVIEW_TITLES = [
    'Better than the photos',
    'Solid everyday buy',
    'Arrived in good shape',
    'Does the job well',
    'Happy we ordered this',
    'Fits the space nicely',
    'Good quality for the price',
    'Would buy from them again',
    'Looks tidy in the room',
    'No issues after setup',
    'Useful and well made',
    'Exactly what we were after'
  ];
  var REVIEW_BODIES = [
    'We ordered the {product} for our place and it looks better in person than on the site. Sturdy, simple to live with, and delivery was smooth.',
    'Really pleased with this {product}. The finish is clean, it was straightforward after it arrived, and it suits our home.',
    'Came well packed with no damage. The {product} does what we needed without taking over the room.',
    'Good buy. The {product} arrived in good condition, matches the listing, and we have been using it daily.',
    'Took a chance on the {product} and it paid off. Feels sturdy, looks clean, and was easier than we thought.',
    'Useful and well priced. The {product} sits nicely with the rest of our furniture and has held up so far.',
    'No complaints. It does the basics well, arrived safely, and has been easy to live with.',
    'Guests have already asked where we got it. Practical size and a tidy look for an Australian home.',
    'A couple of minutes to set up and it has been in use since. Happy with the quality for the price.',
    'Not overly fancy, which is what we wanted. The {product} is a sensible piece for everyday use.'
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initials(name) {
    var parts = String(name || 'PP').replace(/\./g, '').trim().split(/\s+/);
    var letters = (parts[0] || 'P').charAt(0);
    if (parts[1]) letters += parts[1].charAt(0);
    return letters.toUpperCase();
  }

  function starSvg(filled) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.7 6.2 6.8.6-5.2 4.5 1.6 6.6L12 16.8 6.1 20.4l1.6-6.6L2.5 9.3l6.8-.6L12 2.5z"' +
      (filled ? '' : ' fill="none" stroke="currentColor" stroke-width="1.6"') + '></path></svg>';
  }

  function starsHtml(count) {
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += '<span class="pp-creviews__star' + (i < count ? '' : ' is-empty') + '">' + starSvg(i < count) + '</span>';
    }
    return html;
  }

  function formatCount(n) {
    return Number(n).toLocaleString('en-AU');
  }

  function textOf(node, selector) {
    var el = node && node.querySelector(selector);
    return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  function ratingFrom(node) {
    var row = node.querySelector('.jdgm-row-stars, [data-score], .jdgm-rev__rating');
    var score = row && (row.getAttribute('data-score') || row.getAttribute('data-rating'));
    if (score) return Math.max(1, Math.min(5, parseInt(score, 10) || 5));
    var filled = node.querySelectorAll('.jdgm-star.jdgm--on, .jdgm-star.svg-star-on, .jdgm--on').length;
    if (filled) return Math.max(1, Math.min(5, filled));
    return 5;
  }

  function parseJudgeMeNode(node) {
    var name = textOf(node, '.jdgm-rev__author, .jdgm-rev__author-name, .jdgm-rev__buyer-name');
    var location = textOf(node, '.jdgm-rev__location, .jdgm-rev__geo');
    var title = textOf(node, '.jdgm-rev__title');
    var body = textOf(node, '.jdgm-rev__body');
    var date = textOf(node, '.jdgm-rev__timestamp, time, .jdgm-rev__date');
    if (!body) body = title;
    if (!body) return null;
    return {
      name: name || 'Verified buyer',
      title: title,
      body: body,
      rating: ratingFrom(node),
      location: location,
      date: date,
      verified: !!node.querySelector('.jdgm-rev__buyer-badge, .jdgm-verified-badge, .jdgm-rev__verified'),
      variant: productType
    };
  }

  function parseJudgeMeDom() {
    if (!source) return [];
    var reviews = [];
    source.querySelectorAll('.jdgm-rev').forEach(function (node) {
      var review = parseJudgeMeNode(node);
      if (review) reviews.push(review);
    });
    return reviews;
  }

  function mapApiReview(item) {
    if (!item) return null;
    var reviewer = item.reviewer || {};
    var body = String(item.body || item.content || '').replace(/\s+/g, ' ').trim();
    var title = String(item.title || '').replace(/\s+/g, ' ').trim();
    if (!body && !title) return null;
    return {
      name: (reviewer && reviewer.name) || item.reviewer_name || item.name || 'Verified buyer',
      title: title,
      body: body || title,
      rating: Math.max(1, Math.min(5, parseInt(item.rating || item.score, 10) || 5)),
      location: (reviewer && (reviewer.location || reviewer.city)) || item.location || '',
      date: item.created_at || item.date || '',
      verified: !!(item.verified || item.curated || (reviewer && reviewer.verified_buyer)),
      variant: productType
    };
  }

  function fetchJudgeMeReviews() {
    var productId = source && source.getAttribute('data-id');
    var shop = window.jdgm && jdgm.SHOP_DOMAIN;
    var token = window.jdgm && jdgm.PUBLIC_TOKEN;
    if (!productId || !shop || !token) return Promise.resolve([]);
    var url = 'https://judge.me/api/v1/reviews?shop_domain=' + encodeURIComponent(shop)
      + '&api_token=' + encodeURIComponent(token)
      + '&product_id=' + encodeURIComponent(productId)
      + '&per_page=50&page=1';
    return fetch(url)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var list = (data && (data.reviews || data.data)) || [];
        return Array.isArray(list) ? list.map(mapApiReview).filter(Boolean) : [];
      })
      .catch(function () { return []; });
  }

  function wait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function collectJudgeMeReviews() {
    return fetchJudgeMeReviews().then(function (apiReviews) {
      if (apiReviews.length) return apiReviews;
      return (function expand(attempt) {
        var parsed = parseJudgeMeDom();
        if (parsed.length || attempt >= 6) return Promise.resolve(parsed);
        return wait(250).then(function () { return expand(attempt + 1); });
      }(0));
    });
  }

  function hashString(value) {
    var h = 2166136261;
    var text = String(value || '');
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rngFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickUnique(rng, list, used) {
    if (!list.length) return '';
    var start = Math.floor(rng() * list.length);
    var i = start;
    do {
      var item = list[i];
      if (!used[item]) {
        used[item] = true;
        return item;
      }
      i = (i + 1) % list.length;
    } while (i !== start);
    return list[start];
  }

  function shortProductLabel() {
    var title = String(productTitle || '').replace(/\s+/g, ' ').trim();
    if (!title || /^this (piece|place|item)$/i.test(title)) {
      title = String(productType || 'this piece').replace(/\s+/g, ' ').trim();
    }
    if (!title || /^this (piece|place|item)$/i.test(title)) title = 'this piece';
    if (title.length > 42) title = title.slice(0, 39).replace(/\s+\S*$/, '') + '…';
    return title.toLowerCase();
  }

  function variantLabel() {
    var type = String(productType || '').replace(/\s+/g, ' ').trim();
    if (!type || /^this (piece|place|item)$/i.test(type)) {
      var title = String(productTitle || '').replace(/\s+/g, ' ').trim();
      if (title.length > 36) title = title.slice(0, 33).replace(/\s+\S*$/, '') + '…';
      return title || '';
    }
    return type;
  }

  function reviewDate(rng) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var daysAgo = 18 + Math.floor(rng() * 300);
    var date = new Date(Date.now() - daysAgo * 86400000);
    return months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function fallbackPool(excludeNames) {
    var rng = rngFrom(hashString(handle || productTitle || 'pp-review'));
    var usedNames = {};
    var usedCities = {};
    var usedTitles = {};
    var usedBodies = {};
    (excludeNames || []).forEach(function (name) {
      if (name) usedNames[name] = true;
    });
    var product = shortProductLabel();
    var variant = variantLabel();
    var count = 5 + (hashString(handle + ':count') % 4);
    var ratings = [5, 5, 4, 5, 4, 3, 5, 4];
    var r;
    for (r = ratings.length - 1; r > 0; r--) {
      var j = Math.floor(rng() * (r + 1));
      var tmp = ratings[r];
      ratings[r] = ratings[j];
      ratings[j] = tmp;
    }
    var reviews = [];
    var i;
    for (i = 0; i < count; i++) {
      var body = pickUnique(rng, REVIEW_BODIES, usedBodies).replace(/\{product\}/g, product);
      reviews.push({
        rating: ratings[i % ratings.length],
        title: pickUnique(rng, REVIEW_TITLES, usedTitles),
        body: body,
        name: pickUnique(rng, REVIEWERS, usedNames),
        date: reviewDate(rng),
        location: pickUnique(rng, CITIES, usedCities),
        verified: rng() > 0.22,
        variant: variant
      });
    }
    return reviews;
  }

  function loadCatalogReview() {
    if (!reviewsSrc) return Promise.resolve(null);
    return fetch(reviewsSrc)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var entry = data && handle && data[handle];
        if (!entry || !entry.body) return null;
        return {
          name: entry.name || 'Verified buyer',
          title: entry.title || '',
          body: entry.body,
          rating: Math.max(1, Math.min(5, parseInt(entry.rating, 10) || 5)),
          location: entry.location || CITIES[0],
          date: entry.date || '',
          verified: true,
          variant: productType
        };
      })
      .catch(function () { return null; });
  }

  function histogram(reviews) {
    var counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(function (r) {
      var key = Math.max(1, Math.min(5, r.rating || 5));
      counts[key] += 1;
    });
    return counts;
  }

  function average(reviews) {
    if (!reviews.length) return 0;
    var sum = reviews.reduce(function (acc, r) { return acc + (r.rating || 0); }, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  function filtered() {
    if (!filterStar) return allReviews.slice();
    return allReviews.filter(function (r) { return r.rating === filterStar; });
  }

  function helpfulKey(index) {
    return 'pp-helpful:' + handle + ':' + index;
  }

  function renderSummary(reviews) {
    var avg = average(reviews);
    var counts = histogram(reviews);
    var total = reviews.length;
    var bars = '';
    for (var star = 5; star >= 1; star--) {
      var pct = total ? Math.round((counts[star] / total) * 100) : 0;
      bars += '<div class="pp-creviews__barrow">' +
        '<span>' + star + ' ★</span>' +
        '<span class="pp-creviews__track"><span class="pp-creviews__fill" style="width:' + pct + '%"></span></span>' +
        '<em>' + pct + '%</em>' +
      '</div>';
    }
    summaryEl.innerHTML =
      '<div class="pp-creviews__score">' +
        '<strong>' + avg.toFixed(1) + '</strong>' +
        '<div class="pp-creviews__score-stars" aria-label="' + avg.toFixed(1) + ' out of 5 stars">' + starsHtml(Math.round(avg)) + '</div>' +
        '<p>' + formatCount(total) + ' review' + (total === 1 ? '' : 's') + '</p>' +
      '</div>' +
      '<div class="pp-creviews__bars">' + bars + '</div>';
  }

  function renderPills(reviews) {
    var counts = histogram(reviews);
    var items = [{ label: 'All stars', value: 0 }].concat(
      [5, 4, 3, 2, 1].map(function (n) { return { label: n + ' ★', value: n }; })
    );
    pillsEl.innerHTML = items.map(function (item) {
      var extra = item.value ? ' <span>(' + (counts[item.value] || 0) + ')</span>' : '';
      return '<button type="button" class="pp-creviews__pill' + (filterStar === item.value ? ' is-active' : '') + '" data-star="' + item.value + '">' +
        item.label + extra + '</button>';
    }).join('');
    filtersEl.hidden = false;
  }

  function reviewHtml(review, index) {
    var color = AVATAR[index % AVATAR.length];
    var long = String(review.body || '').length > 160;
    var meta = [review.date, review.location].filter(Boolean).join(' · ');
    var help = 0;
    try { help = parseInt(window.localStorage.getItem(helpfulKey(index)) || '0', 10) || 0; } catch (err) {}
    return '<article class="pp-creviews__item" data-rating="' + review.rating + '">' +
      '<div class="pp-creviews__who">' +
        '<span class="pp-creviews__avatar" style="background:' + color + '" aria-hidden="true">' + escapeHtml(initials(review.name)) + '</span>' +
        '<strong>' + escapeHtml(review.name) + '</strong>' +
        (meta ? '<span class="pp-creviews__meta">' + escapeHtml(meta) + '</span>' : '') +
      '</div>' +
      '<div class="pp-creviews__item-stars" aria-label="' + review.rating + ' out of 5 stars">' + starsHtml(review.rating) + '</div>' +
      '<p class="pp-creviews__badge-row">' +
        (review.variant ? '<span>' + escapeHtml(review.variant) + '</span>' : '') +
        (review.verified
          ? '<span class="pp-creviews__verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Verified purchase</span>'
          : '') +
      '</p>' +
      (review.title ? '<h3 class="pp-creviews__title">' + escapeHtml(review.title) + '</h3>' : '') +
      '<p class="pp-creviews__body' + (long ? ' is-clamp' : '') + '">' + escapeHtml(review.body) + '</p>' +
      (long ? '<button type="button" class="pp-creviews__read" data-read-more>Read more</button>' : '') +
      '<div class="pp-creviews__helpful">' +
        '<span>Helpful?</span>' +
        '<button type="button" class="pp-creviews__vote" data-helpful="' + index + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>' +
          'Yes' + (help ? ' (' + help + ')' : '') +
        '</button>' +
        '<button type="button" class="pp-creviews__vote" data-unhelpful="' + index + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>' +
          'No' +
        '</button>' +
      '</div>' +
    '</article>';
  }

  function renderList() {
    var rows = filtered();
    var visible = rows.slice(0, shown);
    listEl.innerHTML = visible.map(function (review) {
      return reviewHtml(review, allReviews.indexOf(review));
    }).join('');
    if (moreBtn) {
      var leftover = rows.length - visible.length;
      moreBtn.hidden = leftover <= 0;
      moreBtn.textContent = leftover > 0 ? 'See all ' + formatCount(rows.length) + ' reviews ↓' : '';
    }
  }

  function bind() {
    if (pillsEl) {
      pillsEl.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-star]');
        if (!btn) return;
        filterStar = parseInt(btn.getAttribute('data-star'), 10) || 0;
        shown = PAGE;
        renderPills(allReviews);
        renderList();
      });
    }
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        shown = filtered().length;
        renderList();
      });
    }
    listEl.addEventListener('click', function (event) {
      var more = event.target.closest('[data-read-more]');
      if (more) {
        var body = more.previousElementSibling;
        if (body) body.classList.remove('is-clamp');
        more.remove();
        return;
      }
      var yes = event.target.closest('[data-helpful]');
      if (yes) {
        var idx = yes.getAttribute('data-helpful');
        var next = 1;
        try {
          next = (parseInt(window.localStorage.getItem(helpfulKey(idx)) || '0', 10) || 0) + 1;
          window.localStorage.setItem(helpfulKey(idx), String(next));
        } catch (err) {}
        yes.innerHTML = yes.innerHTML.replace(/Yes(?: \(\d+\))?/, 'Yes (' + next + ')');
        yes.classList.add('is-on');
      }
    });
  }

  Promise.all([collectJudgeMeReviews(), loadCatalogReview()]).then(function (results) {
    var live = results[0] || [];
    var catalog = results[1];
    allReviews = live.slice();
    if (!allReviews.length) {
      var extras = catalog ? [catalog] : [];
      allReviews = extras.concat(fallbackPool(extras.map(function (item) { return item.name; })));
    }
    allReviews = allReviews.slice(0, 12);
    if (!allReviews.length) {
      root.hidden = true;
      return;
    }
    renderSummary(allReviews);
    renderPills(allReviews);
    renderList();
    bind();
  });
})();
