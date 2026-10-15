(function () {
  'use strict';

  if (window.PPWishlist && window.PPWishlist.__ppReady) return;

  var STORAGE_KEY = 'pp-wishlist';
  var LEGACY_KEY = 'pp-collection-wishlist';
  var listeners = [];

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw || '');
    } catch (error) {
      return fallback;
    }
  }

  function clean(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function normalizeItem(item) {
    if (!item) return null;
    if (typeof item === 'string' || typeof item === 'number') {
      var legacyId = clean(item);
      return legacyId ? { id: legacyId, handle: '', title: '', url: '', image: '', price: '' } : null;
    }

    var id = clean(item.id);
    var handle = clean(item.handle);
    if (!id && !handle) return null;

    return {
      id: id,
      handle: handle,
      title: clean(item.title),
      url: clean(item.url) || (handle ? '/products/' + handle : ''),
      image: clean(item.image),
      price: clean(item.price)
    };
  }

  function sameItem(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;
    if (a.handle && b.handle && a.handle === b.handle) return true;
    return false;
  }

  function readRaw() {
    var items = safeParse(window.localStorage.getItem(STORAGE_KEY), null);
    if (!Array.isArray(items)) {
      var legacy = safeParse(window.localStorage.getItem(LEGACY_KEY), []);
      items = Array.isArray(legacy) ? legacy : [];
    }
    return items.map(normalizeItem).filter(Boolean);
  }

  function writeRaw(items) {
    var normalized = items.map(normalizeItem).filter(Boolean);
    // Deduplicate by id/handle
    var unique = [];
    normalized.forEach(function (item) {
      if (!unique.some(function (existing) { return sameItem(existing, item); })) {
        unique.push(item);
      }
    });

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify(unique.map(function (item) { return item.id; }).filter(Boolean))
    );

    listeners.slice().forEach(function (listener) {
      try { listener(unique); } catch (error) { /* ignore */ }
    });
    document.dispatchEvent(new CustomEvent('pp:wishlist:change', { detail: { items: unique } }));
    return unique;
  }

  function getAll() {
    return readRaw();
  }

  function count() {
    return readRaw().length;
  }

  function findIndex(id, handle) {
    var idStr = clean(id);
    var handleStr = clean(handle);
    return readRaw().findIndex(function (item) {
      return (idStr && item.id === idStr) || (handleStr && item.handle === handleStr);
    });
  }

  function has(id, handle) {
    return findIndex(id, handle) >= 0;
  }

  function upsert(item) {
    var next = normalizeItem(item);
    if (!next) return getAll();
    var items = readRaw();
    var index = findIndex(next.id, next.handle);
    if (index >= 0) {
      items[index] = Object.assign({}, items[index], next);
    } else {
      items.unshift(next);
    }
    return writeRaw(items);
  }

  function remove(id, handle) {
    var idStr = clean(id);
    var handleStr = clean(handle);
    if (!idStr && !handleStr) return getAll();

    var items = readRaw().filter(function (item) {
      if (idStr && item.id === idStr) return false;
      if (handleStr && item.handle === handleStr) return false;
      return true;
    });
    return writeRaw(items);
  }

  function clear() {
    return writeRaw([]);
  }

  function toggle(item) {
    var next = normalizeItem(item);
    if (!next) return { active: false, items: getAll() };
    if (has(next.id, next.handle)) {
      return { active: false, items: remove(next.id, next.handle) };
    }
    return { active: true, items: upsert(next) };
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.push(listener);
    return function () {
      listeners = listeners.filter(function (entry) { return entry !== listener; });
    };
  }

  function readButtonPayload(button) {
    if (!(button instanceof HTMLElement)) return null;
    return normalizeItem({
      id: button.getAttribute('data-product-id'),
      handle: button.getAttribute('data-product-handle'),
      title: button.getAttribute('data-product-title'),
      url: button.getAttribute('data-product-url'),
      image: button.getAttribute('data-product-image'),
      price: button.getAttribute('data-product-price')
    });
  }

  function syncButton(button) {
    if (!(button instanceof HTMLElement)) return;
    var payload = readButtonPayload(button);
    if (!payload) return;
    var active = has(payload.id, payload.handle);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    var label = button.getAttribute('data-wishlist-label') || 'wishlist';
    button.setAttribute('aria-label', (active ? 'Remove from ' : 'Add to ') + label);
  }

  function syncAllButtons(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-pp-wishlist]').forEach(function (button) {
      syncButton(button);
    });
  }

  function updateHeaderCount() {
    var total = count();
    document.querySelectorAll('[data-pp-wishlist-count]').forEach(function (el) {
      el.textContent = String(total);
      el.hidden = total === 0;
      el.setAttribute('data-count', String(total));
    });
    document.querySelectorAll('[data-pp-wishlist-link]').forEach(function (el) {
      el.setAttribute('data-count', String(total));
      el.setAttribute('aria-label', total > 0 ? 'Wishlist, ' + total + ' items' : 'Wishlist');
    });
  }

  function bindButtons(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-pp-wishlist]').forEach(function (button) {
      if (!(button instanceof HTMLElement) || button.dataset.ppWishlistBound === 'true') return;
      button.dataset.ppWishlistBound = 'true';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var payload = readButtonPayload(button);
        if (!payload || (!payload.id && !payload.handle)) return;
        var result = toggle(payload);
        syncButton(button);
        button.classList.add('is-pulsing');
        window.setTimeout(function () { button.classList.remove('is-pulsing'); }, 260);
        document.dispatchEvent(new CustomEvent('pp:wishlist:toggle', {
          detail: { active: result.active, item: payload }
        }));
      });
    });
    syncAllButtons(scope);
  }

  function refresh() {
    syncAllButtons(document);
    updateHeaderCount();
  }

  function init() {
    bindButtons(document);
    updateHeaderCount();
    subscribe(refresh);
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY || event.key === LEGACY_KEY) refresh();
    });
  }

  window.PPWishlist = {
    __ppReady: true,
    getAll: getAll,
    count: count,
    has: has,
    upsert: upsert,
    remove: remove,
    clear: clear,
    toggle: toggle,
    subscribe: subscribe,
    bindButtons: bindButtons,
    syncAllButtons: syncAllButtons,
    updateHeaderCount: updateHeaderCount,
    refresh: refresh
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
