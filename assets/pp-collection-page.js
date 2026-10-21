(() => {
  // Collection filters, sorting and pagination all use Shopify's native
  // filtering. Changes fetch the section from Shopify (Section Rendering
  // API) and swap it in; if that fails the browser just loads the URL.
  const ROOT_SELECTOR = '.pp-collection-template';
  const mediaQuery = window.matchMedia('(max-width: 880px)');
  let activeRequest = null;

  // The filters sit in a plain container rather than a <form>: product cards
  // carry their own add-to-cart forms, and forms can't be nested.
  const urlFromForm = (root) => {
    const container = root.querySelector('[data-pp-collection-form]');
    const action = container instanceof HTMLElement ? container.dataset.action : '';
    const url = new URL(action || window.location.pathname, window.location.origin);
    if (!(container instanceof HTMLElement)) return url;
    const params = new URLSearchParams();
    container.querySelectorAll('input[name]').forEach((input) => {
      if (!(input instanceof HTMLInputElement) || input.disabled || input.closest('form')) return;
      if ((input.type === 'checkbox' || input.type === 'radio') && !input.checked) return;
      if (input.name.startsWith('pp-price-band')) return;
      if (input.value.trim() === '') return;
      params.append(input.name, input.value);
    });
    url.search = params.toString();
    return url;
  };

  const setDrawerState = (root, isOpen) => {
    const overlay = root.querySelector('[data-overlay]');
    const drawer = root.querySelector('.pp-drawer');
    if (!(overlay instanceof HTMLElement) || !(drawer instanceof HTMLElement)) return;
    overlay.classList.toggle('is-open', isOpen);
    drawer.classList.toggle('is-open', isOpen);
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.classList.toggle('is-locked', isOpen);
  };

  const setResponsiveFilterSource = (root) => {
    const useDrawer = mediaQuery.matches;
    root.querySelectorAll('[data-filter-source="desktop"] input').forEach((input) => {
      if (input instanceof HTMLInputElement) input.disabled = useDrawer;
    });
    root.querySelectorAll('[data-filter-source="drawer"] input').forEach((input) => {
      if (input instanceof HTMLInputElement) input.disabled = !useDrawer;
    });
    if (!useDrawer) setDrawerState(root, false);
  };

  const setCollectionView = (root, view) => {
    const nextView = view === 'list' ? 'list' : 'grid';
    const grid = root.querySelector('#product-grid');
    if (grid instanceof HTMLElement) grid.classList.toggle('is-list', nextView === 'list');
    root.querySelectorAll('[data-view]').forEach((button) => {
      const isActive = button instanceof HTMLElement && button.dataset.view === nextView;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    try {
      window.localStorage.setItem('pp-collection-view', nextView);
    } catch {
      /* ignore */
    }
  };

  const wholeDollars = (input) => {
    if (!(input instanceof HTMLInputElement) || input.value.trim() === '') return '';
    const amount = Math.floor(Number(input.value));
    return Number.isFinite(amount) ? String(amount) : '';
  };

  const syncPriceBands = (scope) => {
    const minVal = wholeDollars(scope.querySelector('[data-price-min]'));
    const maxVal = wholeDollars(scope.querySelector('[data-price-max]'));
    scope.querySelectorAll('[data-price-band]').forEach((band) => {
      if (!(band instanceof HTMLInputElement)) return;
      band.checked = (band.dataset.bandMin || '') === minVal && (band.dataset.bandMax || '') === maxVal;
    });
  };

  const bindWishlist = (root) => {
    if (window.PPWishlist) {
      window.PPWishlist.bindButtons(root);
      return;
    }
    const key = 'pp-wishlist';
    const read = () => {
      try {
        return JSON.parse(window.localStorage.getItem(key) || window.localStorage.getItem('pp-collection-wishlist') || '[]');
      } catch {
        return [];
      }
    };
    const items = new Set(read().map((item) => (item && typeof item === 'object' ? String(item.id) : String(item))).filter(Boolean));
    root.querySelectorAll('[data-pp-wishlist], [data-wishlist]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || !button.dataset.productId) return;
      const id = button.dataset.productId;
      button.classList.toggle('is-active', items.has(id));
      button.addEventListener('click', () => {
        if (items.has(id)) {
          items.delete(id);
          button.classList.remove('is-active');
        } else {
          items.add(id);
          button.classList.add('is-active', 'pulse');
          window.setTimeout(() => button.classList.remove('pulse'), 250);
        }
        try {
          window.localStorage.setItem(key, JSON.stringify(Array.from(items)));
        } catch {
          /* ignore */
        }
      });
    });
  };

  let init = () => {};

  const load = async (root, href, { push = true, scroll = false } = {}) => {
    const target = new URL(href, window.location.origin);
    target.searchParams.delete('section_id');
    const sectionId = root.dataset.sectionId;
    if (!sectionId) {
      window.location.assign(target.toString());
      return;
    }

    const fetchUrl = new URL(target.toString());
    fetchUrl.searchParams.set('section_id', sectionId);

    if (activeRequest) activeRequest.abort();
    activeRequest = new AbortController();
    root.classList.add('is-loading');
    root.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(fetchUrl.toString(), { signal: activeRequest.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const next = doc.querySelector(ROOT_SELECTOR);
      if (!(next instanceof HTMLElement)) throw new Error('Missing collection markup');

      document.body.classList.remove('is-locked');
      root.replaceWith(next);
      if (push) window.history.pushState({ ppCollection: true }, '', `${target.pathname}${target.search}`);
      init(next);
      if (scroll) {
        const top = next.querySelector('.pp-collection-main') || next;
        top.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      window.location.assign(target.toString());
    }
  };

  init = (root) => {
    if (!(root instanceof HTMLElement) || root.dataset.ppCollectionReady === 'true') return;
    root.dataset.ppCollectionReady = 'true';

    if (!root.querySelector('[data-pp-collection-form]')) return;

    const apply = (options = {}) => load(root, urlFromForm(root).toString(), options);
    const applyAndClose = () => {
      setDrawerState(root, false);
      apply({ scroll: mediaQuery.matches });
    };

    // "Go" next to the price fields and the drawer's "Show results".
    root.querySelectorAll('[data-pp-apply]').forEach((button) => {
      button.addEventListener('click', applyAndClose);
    });

    // Desktop sidebar applies each change straight away; the mobile drawer
    // applies when "Show results" is pressed.
    root.querySelectorAll('[data-filter-source="desktop"] [data-pp-filter-input]').forEach((input) => {
      if (!(input instanceof HTMLInputElement) || input.hasAttribute('data-price-input')) return;
      input.addEventListener('change', () => apply());
    });

    root.querySelectorAll('[data-price-input]').forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      const scope = input.closest('[data-filter-group]') || root;
      input.addEventListener('input', () => syncPriceBands(scope));
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        applyAndClose();
      });
    });

    root.querySelectorAll('[data-price-band]').forEach((band) => {
      if (!(band instanceof HTMLInputElement)) return;
      band.addEventListener('change', () => {
        if (!band.checked) return;
        const scope = band.closest('[data-filter-group]') || root;
        const minInput = scope.querySelector('[data-price-min]');
        const maxInput = scope.querySelector('[data-price-max]');
        if (minInput instanceof HTMLInputElement) minInput.value = band.dataset.bandMin || '';
        if (maxInput instanceof HTMLInputElement) maxInput.value = band.dataset.bandMax || '';
        if (band.closest('[data-filter-source="desktop"]')) apply();
      });
    });

    root.querySelectorAll('[data-group-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.closest('[data-filter-group]');
        if (!(group instanceof HTMLElement)) return;
        const collapsed = group.classList.toggle('is-collapsed');
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
    });

    // Chips, "Clear all" and page links load without a full page reload.
    root.addEventListener('click', (event) => {
      const link = event.target instanceof Element
        ? event.target.closest('a[data-pp-nav], a.pp-chip, a.pp-chips__clear, a.pp-drawer__clear')
        : null;
      if (!(link instanceof HTMLAnchorElement) || !link.href) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      setDrawerState(root, false);
      load(root, link.href, { scroll: link.hasAttribute('data-pp-nav') });
    });

    const sort = root.querySelector('[data-sort]');
    const sortButton = root.querySelector('[data-sort-btn]');
    const sortInput = root.querySelector('[data-pp-sort-input]');
    if (sort instanceof HTMLElement && sortButton instanceof HTMLButtonElement && sortInput instanceof HTMLInputElement) {
      const closeSort = () => {
        sort.classList.remove('is-open');
        sortButton.setAttribute('aria-expanded', 'false');
      };
      sortButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = sort.classList.toggle('is-open');
        sortButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      sort.querySelectorAll('[data-sort-option]').forEach((option) => {
        option.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          sortInput.value = option.getAttribute('data-sort-option') || '';
          closeSort();
          apply();
        });
      });
      document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element) || !sort.contains(event.target)) closeSort();
      });
    }

    root.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => setCollectionView(root, button instanceof HTMLElement ? button.dataset.view : 'grid'));
    });
    try {
      setCollectionView(root, window.localStorage.getItem('pp-collection-view') || 'grid');
    } catch {
      setCollectionView(root, 'grid');
    }

    root.querySelector('[data-open-drawer]')?.addEventListener('click', () => setDrawerState(root, true));
    root.querySelector('[data-overlay]')?.addEventListener('click', () => setDrawerState(root, false));
    root.querySelectorAll('[data-close-drawer]').forEach((button) => {
      button.addEventListener('click', () => setDrawerState(root, false));
    });

    bindWishlist(root);
    setResponsiveFilterSource(root);
  };

  document.querySelectorAll(ROOT_SELECTOR).forEach((root) => init(root));

  mediaQuery.addEventListener('change', () => {
    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => setResponsiveFilterSource(root));
  });

  window.addEventListener('popstate', () => {
    const root = document.querySelector(ROOT_SELECTOR);
    if (root instanceof HTMLElement) load(root, window.location.href, { push: false });
  });
})();
