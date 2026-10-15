import { Component } from '@theme/component';
import { debounce, onAnimationEnd, prefersReducedMotion } from '@theme/utilities';
import { sectionRenderer } from '@theme/section-renderer';
import { morph } from '@theme/morph';
import { RecentlyViewed } from '@theme/recently-viewed-products';
import { DialogCloseEvent, DialogOpenEvent, DialogComponent } from '@theme/dialog';

/**
 * A custom element that allows the user to search for resources available on the store.
 *
 * @typedef {object} Refs
 * @property {HTMLInputElement} searchInput - The search input element.
 * @property {HTMLElement} predictiveSearchResults - The predictive search results container.
 * @property {HTMLElement} resetButton - The reset button element.
 * @property {HTMLElement[]} [resultsItems] - The search results items elements.
 * @property {HTMLElement} [recentlyViewedWrapper] - The recently viewed products wrapper.
 * @property {HTMLElement[]} [recentlyViewedTitle] - The recently viewed title elements.
 * @property {HTMLElement[]} [recentlyViewedItems] - The recently viewed product items.
 * @extends {Component<Refs>}
 */
class PredictiveSearchComponent extends Component {
  requiredRefs = ['searchInput', 'predictiveSearchResults', 'resetButton'];

  #controller = new AbortController();

  /**
   * @type {AbortController | null}
   */
  #activeFetch = null;

  #emptyStateLoaded = false;

  /**
   * Get the dialog component.
   * @returns {DialogComponent | null} The dialog component.
   */
  get dialog() {
    return this.closest('dialog-component');
  }

  get isInline() {
    return this.hasAttribute('data-inline-search');
  }

  connectedCallback() {
    super.connectedCallback();

    const { dialog } = this;
    const { signal } = this.#controller;

    if (this.refs.searchInput.value.length > 0) {
      this.#showResetButton();
    }

    if (this.isInline) {
      this.addEventListener('focusin', this.#handleInlineFocusIn, { signal });
      this.addEventListener('focusout', this.#handleInlineFocusOut, { signal });
      this.addEventListener('click', this.#handleInlineClick, { signal });
      document.addEventListener('pointerdown', this.#handleInlinePointerDown, { signal });
      this.#updateViewAllButtonLabel();
      this.#syncResultsId();
      this.#closeInlinePanel();
    }

    if (dialog) {
      document.addEventListener('keydown', this.#handleKeyboardShortcut, { signal });
      dialog.addEventListener(DialogCloseEvent.eventName, this.#handleDialogClose, { signal });
      dialog.addEventListener(DialogOpenEvent.eventName, this.#handleDialogOpen, { signal, once: true });

      this.addEventListener('click', this.#handleModalClick, { signal });
    }

    if (!this.isInline && RecentlyViewed.getProducts().length > 0) {
      requestIdleCallback(() => {
        this.#loadEmptyState();
      });
    }
  }

  openInlinePanel = () => {
    if (!this.isInline) return;

    if (this.refs.searchInput.value.trim().length > 0) {
      this.#openResultsPanel();
      return;
    }

    this.#showDefaultPanel();
  };

  #handleInlineFocusIn = () => {
    this.openInlinePanel();
  };

  #handleInlineFocusOut = () => {
    requestAnimationFrame(() => {
      if (!this.contains(document.activeElement)) {
        this.#closeInlinePanel();
      }
    });
  };

  #handleInlinePointerDown = (event) => {
    if (!this.contains(/** @type {Node} */ (event.target))) {
      this.#closeInlinePanel();
    }
  };

  #handleInlineClick = (event) => {
    const target = /** @type {HTMLElement | null} */ (event.target instanceof HTMLElement ? event.target : null);
    const suggestedTerm = target?.closest('.pp-pill[data-term]');

    if (suggestedTerm instanceof HTMLElement && suggestedTerm.dataset.term) {
      event.preventDefault();
      this.refs.searchInput.value = suggestedTerm.dataset.term;
      this.#showResetButton();
      this.#updateViewAllButtonLabel();
      this.#openResultsPanel();
      this.#getSearchResults(suggestedTerm.dataset.term);
      this.refs.searchInput.focus();
    }
  };

  /**
   * Handles clicks within the predictive search modal to maintain focus on the input
   * @param {MouseEvent} event - The mouse event
   */
  #handleModalClick = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const isInteractiveElement =
      target instanceof HTMLButtonElement ||
      target instanceof HTMLAnchorElement ||
      target instanceof HTMLInputElement ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input');

    if (!isInteractiveElement && this.refs.searchInput) {
      this.refs.searchInput.focus();
    }
  };

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#controller.abort();
  }

  /**
   * Handles the CMD+K key combination.
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #handleKeyboardShortcut = (event) => {
    if (event.metaKey && event.key === 'k') {
      this.dialog?.toggleDialog();
    }
  };

  /**
   * Handles the dialog close event.
   */
  #handleDialogClose = () => {
    this.#resetSearch();
  };

  #handleDialogOpen = () => {
    if (!this.#emptyStateLoaded && RecentlyViewed.getProducts().length > 0) {
      this.#loadEmptyState();
    }
  };

  #loadEmptyState() {
    if (this.#emptyStateLoaded) return;
    this.#emptyStateLoaded = true;
    this.resetSearch(false);
  }

  get #allResultsItems() {
    const allItems = Array.from(
      this.refs.predictiveSearchResults.querySelectorAll('[ref="resultsItems[]"], .predictive-search-results__card')
    ).filter((item) => item instanceof HTMLElement);

    return /** @type {HTMLElement[]} */ (allItems);
  }

  /**
   * Track whether the last interaction was keyboard-based
   * @type {boolean}
   */
  #isKeyboardNavigation = false;

  get #currentIndex() {
    return this.#allResultsItems?.findIndex((item) => item.getAttribute('aria-selected') === 'true') ?? -1;
  }

  set #currentIndex(index) {
    if (!this.#allResultsItems?.length) return;

    let activeItem = null;

    this.#allResultsItems.forEach((item) => {
      item.classList.remove('keyboard-focus');
      item.querySelector('.pp-result')?.classList.remove('is-highlighted');
    });

    for (const [itemIndex, item] of this.#allResultsItems.entries()) {
      if (itemIndex === index) {
        item.setAttribute('aria-selected', 'true');
        if (this.#isKeyboardNavigation) {
          item.classList.add('keyboard-focus');
        }
        item.querySelector('.pp-result')?.classList.add('is-highlighted');
        activeItem = item;
      } else {
        item.removeAttribute('aria-selected');
      }
    }

    activeItem?.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth', block: 'nearest' });
    this.refs.searchInput.focus();
  }

  get #currentItem() {
    return this.#allResultsItems?.[this.#currentIndex];
  }

  /**
   * Navigate through the predictive search results using arrow keys or close them with the Escape key.
   * @param {KeyboardEvent} event - The keyboard event.
   */
  onSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      this.#resetSearch();
      if (this.isInline) {
        this.#closeInlinePanel();
      }
      return;
    }

    if (!this.#allResultsItems?.length || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      return;
    }

    const currentIndex = this.#currentIndex;
    const totalItems = this.#allResultsItems.length;

    switch (event.key) {
      case 'ArrowDown':
        this.#isKeyboardNavigation = true;
        event.preventDefault();
        this.#currentIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        break;

      case 'Tab':
        if (event.shiftKey) {
          this.#isKeyboardNavigation = true;
          event.preventDefault();
          this.#currentIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        } else {
          this.#isKeyboardNavigation = true;
          event.preventDefault();
          this.#currentIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        }
        break;

      case 'ArrowUp':
        this.#isKeyboardNavigation = true;
        event.preventDefault();
        this.#currentIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        break;

      case 'Enter': {
        const singleResultContainer = this.refs.predictiveSearchResults.querySelector('[data-single-result-url]');
        if (singleResultContainer instanceof HTMLElement && singleResultContainer.dataset.singleResultUrl) {
          event.preventDefault();
          window.location.href = singleResultContainer.dataset.singleResultUrl;
          return;
        }

        if (this.#currentIndex >= 0) {
          event.preventDefault();
          this.#currentItem?.querySelector('a')?.click();
        } else {
          const searchUrl = new URL(Theme.routes.search_url, location.origin);
          searchUrl.searchParams.set('q', this.refs.searchInput.value);
          window.location.href = searchUrl.toString();
        }
        break;
      }
    }
  };

  /**
   * Clears the recently viewed products.
   * @param {Event} event - The event.
   */
  clearRecentlyViewedProducts(event) {
    event.stopPropagation();

    RecentlyViewed.clearProducts();

    const { recentlyViewedItems, recentlyViewedTitle, recentlyViewedWrapper } = this.refs;

    const allRecentlyViewedElements = [...(recentlyViewedItems || []), ...(recentlyViewedTitle || [])];

    if (allRecentlyViewedElements.length === 0) {
      return;
    }

    if (recentlyViewedWrapper) {
      recentlyViewedWrapper.classList.add('removing');

      onAnimationEnd(recentlyViewedWrapper, () => {
        recentlyViewedWrapper.remove();
      });
    }
  }

  /**
   * Reset the search state.
   * @param {boolean} [keepFocus=true] - Whether to keep focus on input after reset
   */
  resetSearch = debounce((keepFocus = true) => {
    if (keepFocus) {
      this.refs.searchInput.focus();
    }
    this.#resetSearch();
  }, 100);

  /**
   * Debounce the search handler to fetch and display search results based on the input value.
   * Reset the current selection index and close results if the search term is empty.
   */
  search = debounce((event) => {
    // If the input is not a text input (like using the Escape key), don't search
    if (!event.inputType) return;

    const searchTerm = this.refs.searchInput.value.trim();
    this.#currentIndex = -1;
    this.#updateViewAllButtonLabel();

    if (!searchTerm.length) {
      this.#resetSearch();
      return;
    }

    this.#showResetButton();
    if (this.isInline) {
      this.#openResultsPanel();
    }
    this.#getSearchResults(searchTerm);
  }, 200);

  /**
   * Resets scroll positions for search results containers
   */
  #resetScrollPositions() {
    requestAnimationFrame(() => {
      this.refs.predictiveSearchResults.querySelector('.predictive-search-results__inner')?.scrollTo(0, 0);
      this.querySelector('.predictive-search-form__content')?.scrollTo(0, 0);
    });
  }

  /**
   * Fetch search results using the section renderer and update the results container.
   * @param {string} searchTerm - The term to search for
   */
  async #getSearchResults(searchTerm) {
    if (!this.dataset.sectionId) return;

    const url = new URL(Theme.routes.predictive_search_url, location.origin);
    url.searchParams.set('q', searchTerm);
    url.searchParams.set('resources[limit_scope]', 'each');
    if (this.isInline) {
      url.searchParams.set('resources[type]', 'product,collection');
    }

    const { predictiveSearchResults } = this.refs;

    const abortController = this.#createAbortController();

    sectionRenderer
      .getSectionHTML(this.dataset.sectionId, false, url)
      .then((resultsMarkup) => {
        if (!resultsMarkup) return;

        if (abortController.signal.aborted) return;

        morph(predictiveSearchResults, resultsMarkup);
        this.#syncResultsId();
        this.#updateViewAllButtonLabel();

        if (this.isInline) {
          const viewAllFooter = this.#inlineViewAllFooter;
          if (viewAllFooter instanceof HTMLElement) {
            viewAllFooter.hidden = this.refs.searchInput.value.trim().length === 0;
          }
        }

        this.#resetScrollPositions();
      })
      .catch((error) => {
        if (abortController.signal.aborted) return;
        throw error;
      });
  }

  /**
   * Fetch the markup for the recently viewed products.
   * @returns {Promise<string | null>} The markup for the recently viewed products.
   */
  async #getRecentlyViewedProductsMarkup() {
    if (!this.dataset.sectionId) return null;

    const viewedProducts = RecentlyViewed.getProducts();
    if (viewedProducts.length === 0) return null;

    const url = new URL(Theme.routes.search_url, location.origin);
    url.searchParams.set('q', viewedProducts.map(/** @param {string} id */ (id) => `id:${id}`).join(' OR '));
    url.searchParams.set('resources[type]', 'product');

    return sectionRenderer.getSectionHTML(this.dataset.sectionId, false, url);
  }

  #hideResetButton() {
    const { resetButton } = this.refs;

    resetButton.hidden = true;
  }

  #showResetButton() {
    const { resetButton } = this.refs;

    resetButton.hidden = false;
  }

  get #inlineSearchBar() {
    return this.querySelector('.pp-search-bar');
  }

  get #inlineDropdown() {
    return this.querySelector('.pp-search-dropdown');
  }

  get #inlineDefaultPanel() {
    return this.querySelector('[data-predictive-default-panel]');
  }

  get #inlineResultsContent() {
    return this.querySelector('.predictive-search-form__content');
  }

  get #inlineViewAllFooter() {
    return this.querySelector('.predictive-search-form__footer');
  }

  #setInlineFocusState(isFocused) {
    this.#inlineSearchBar?.classList.toggle('is-focused', isFocused);
  }

  #syncResultsId() {
    const resultsId = this.dataset.resultsId;
    if (!resultsId) return;

    const resultsElement = this.refs.predictiveSearchResults.querySelector('#predictive-search-results');
    if (resultsElement instanceof HTMLElement) {
      resultsElement.id = resultsId;
    }

    this.refs.searchInput.setAttribute('aria-controls', resultsId);
    this.refs.searchInput.setAttribute('aria-owns', resultsId);
  }

  #updateViewAllButtonLabel() {
    const viewAllButton = this.refs.viewAllButton;
    if (!(viewAllButton instanceof HTMLElement)) return;

    const searchTerm = this.refs.searchInput.value.trim();
    const defaultLabel = viewAllButton.dataset.defaultLabel || 'View all results';
    const labelElement = viewAllButton.querySelector('[data-view-all-label]');
    const queryElement = viewAllButton.querySelector('[data-view-all-query]');

    if (labelElement instanceof HTMLElement && queryElement instanceof HTMLElement) {
      labelElement.textContent = searchTerm ? 'View all results for ' : defaultLabel;
      queryElement.textContent = searchTerm ? `"${searchTerm}"` : '';
      queryElement.hidden = !searchTerm;
      return;
    }

    viewAllButton.textContent = searchTerm ? `View all results for "${searchTerm}"` : defaultLabel;
  }

  #showDefaultPanel() {
    const defaultPanel = this.#inlineDefaultPanel;
    const contentWrapper = this.#inlineDropdown;
    const resultsContent = this.#inlineResultsContent;
    const viewAllFooter = this.#inlineViewAllFooter;

    if (defaultPanel instanceof HTMLElement) {
      defaultPanel.hidden = false;
    }

    if (contentWrapper instanceof HTMLElement) {
      contentWrapper.hidden = false;
      contentWrapper.classList.add('is-open');
      contentWrapper.setAttribute('aria-hidden', 'false');
    }

    if (resultsContent instanceof HTMLElement) {
      resultsContent.hidden = true;
    }

    if (viewAllFooter instanceof HTMLElement) {
      viewAllFooter.hidden = true;
    }

    this.refs.searchInput.setAttribute('aria-expanded', 'true');
    this.#setInlineFocusState(true);
  }

  #openResultsPanel() {
    const defaultPanel = this.#inlineDefaultPanel;
    const contentWrapper = this.#inlineDropdown;
    const resultsContent = this.#inlineResultsContent;
    const viewAllFooter = this.#inlineViewAllFooter;

    if (defaultPanel instanceof HTMLElement) {
      defaultPanel.hidden = true;
    }

    if (contentWrapper instanceof HTMLElement) {
      contentWrapper.hidden = false;
      contentWrapper.classList.add('is-open');
      contentWrapper.setAttribute('aria-hidden', 'false');
    }

    if (resultsContent instanceof HTMLElement) {
      resultsContent.hidden = false;
    }

    if (viewAllFooter instanceof HTMLElement) {
      viewAllFooter.hidden = true;
    }

    this.refs.searchInput.setAttribute('aria-expanded', 'true');
    this.#setInlineFocusState(true);
  }

  #closeInlinePanel() {
    const defaultPanel = this.#inlineDefaultPanel;
    const contentWrapper = this.#inlineDropdown;
    const resultsContent = this.#inlineResultsContent;
    const viewAllFooter = this.#inlineViewAllFooter;

    if (defaultPanel instanceof HTMLElement) {
      defaultPanel.hidden = true;
    }

    if (contentWrapper instanceof HTMLElement) {
      contentWrapper.hidden = true;
      contentWrapper.classList.remove('is-open');
      contentWrapper.setAttribute('aria-hidden', 'true');
    }

    if (resultsContent instanceof HTMLElement) {
      resultsContent.hidden = true;
    }

    if (viewAllFooter instanceof HTMLElement) {
      viewAllFooter.hidden = true;
    }

    this.refs.searchInput.setAttribute('aria-expanded', 'false');
    this.#setInlineFocusState(false);
  }

  #createAbortController() {
    const abortController = new AbortController();
    if (this.#activeFetch) {
      this.#activeFetch.abort();
    }
    this.#activeFetch = abortController;
    return abortController;
  }

  #resetSearch = async () => {
    const { predictiveSearchResults, searchInput } = this.refs;
    const emptySectionId = 'predictive-search-empty';

    this.#currentIndex = -1;
    searchInput.value = '';
    this.#hideResetButton();
    this.#updateViewAllButtonLabel();

    if (this.isInline) {
      this.#showDefaultPanel();
      return;
    }

    const abortController = this.#createAbortController();
    const url = new URL(window.location.href);
    url.searchParams.delete('page');

    const emptySectionMarkup = await sectionRenderer.getSectionHTML(emptySectionId, false, url);
    const parsedEmptySectionMarkup = new DOMParser()
      .parseFromString(emptySectionMarkup, 'text/html')
      .querySelector('.predictive-search-empty-section');

    if (!parsedEmptySectionMarkup) throw new Error('No empty section markup found');

    /** This needs to be awaited and not .then so the DOM is already morphed
     * when #closeResults is called and therefore the height is animated */
    const viewedProducts = RecentlyViewed.getProducts();

    if (viewedProducts.length > 0) {
      const recentlyViewedMarkup = await this.#getRecentlyViewedProductsMarkup();
      if (!recentlyViewedMarkup) return;

      const parsedRecentlyViewedMarkup = new DOMParser().parseFromString(recentlyViewedMarkup, 'text/html');
      const recentlyViewedProductsHtml = parsedRecentlyViewedMarkup.getElementById('predictive-search-products');
      if (!recentlyViewedProductsHtml) return;

      for (const child of recentlyViewedProductsHtml.children) {
        if (child instanceof HTMLElement) {
          child.setAttribute('ref', 'recentlyViewedWrapper');
        }
      }

      const collectionElement = parsedEmptySectionMarkup.querySelector('#predictive-search-products');
      if (!collectionElement) return;
      collectionElement.prepend(...recentlyViewedProductsHtml.children);
    }

    if (abortController.signal.aborted) return;

    morph(predictiveSearchResults, parsedEmptySectionMarkup);
    this.#resetScrollPositions();
  };
}

if (!customElements.get('predictive-search-component')) {
  customElements.define('predictive-search-component', PredictiveSearchComponent);
}
