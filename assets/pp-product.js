(function() {
  'use strict';

  if (window.__ppProductBound) return;
  window.__ppProductBound = true;

  const productRoot = document.querySelector('.pp-product-page');
  if (!productRoot) return;

  const productDataNode = document.getElementById('pp-product-data');
  const productData = productDataNode ? JSON.parse(productDataNode.textContent) : null;
  const variantGroups = Array.from(document.querySelectorAll('.pp-variant-options'));
  const selectionText = document.getElementById('selection-text');
  const defaultSelection = Array.isArray(productData?.selectedVariantOptions)
    ? [...productData.selectedVariantOptions]
    : Array.isArray(productData?.variants?.[0]?.options)
      ? [...productData.variants[0].options]
      : [];
  const selection = [...defaultSelection];

  variantGroups.forEach((group) => {
    const selected = group.querySelector('.pp-variant-pill.is-selected');
    if (!selected) return;

    const optionPosition = Number(group.dataset.optionPosition || selected.dataset.optionPosition || 0);
    if (optionPosition > 0) {
      selection[optionPosition - 1] = selected.dataset.variantValue;
    }
  });

  const slides = document.querySelectorAll('.pp-gallery-slide');
  const thumbs = document.querySelectorAll('.pp-thumb');
  const counter = document.getElementById('gallery-counter');
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  const galleryMain = document.getElementById('gallery-main');
  const prefersHoverSelection = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let currentSlide = 0;

  function syncGalleryRatio() {
    if (!galleryMain) return;
    const activeSlide = slides[currentSlide] || productRoot.querySelector('.pp-gallery-slide.is-active');
    const image = activeSlide ? activeSlide.querySelector('.pp-gallery-image') : null;
    const slideRatio = Number(activeSlide?.dataset.ratio || 0);
    const apply = (ratio) => {
      if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return;
      galleryMain.style.setProperty('--pp-gallery-ratio', String(ratio));
    };

    if (slideRatio) apply(slideRatio);
    if (image && image.naturalWidth && image.naturalHeight) {
      apply(image.naturalWidth / image.naturalHeight);
      return;
    }
    if (image && !image.complete) {
      image.addEventListener('load', syncGalleryRatio, { once: true });
    }
  }

  function goToSlide(idx) {
    if (!slides.length) return;
    if (idx < 0) idx = slides.length - 1;
    if (idx >= slides.length) idx = 0;
    slides.forEach((slide, index) => slide.classList.toggle('is-active', index === idx));
    thumbs.forEach((thumb, index) => thumb.setAttribute('aria-current', index === idx ? 'true' : 'false'));
    if (counter) counter.textContent = `Image ${idx + 1} of ${slides.length}`;
    currentSlide = idx;
    resetGalleryZoom();
    syncGalleryRatio();
  }

  function getActiveGalleryImage() {
    const activeSlide = slides[currentSlide] || productRoot.querySelector('.pp-gallery-slide.is-active');
    return activeSlide ? activeSlide.querySelector('.pp-gallery-image') : null;
  }

  function resetGalleryZoom() {
    if (!galleryMain) return;
    galleryMain.classList.remove('is-zooming');
    const image = getActiveGalleryImage();
    if (image) image.style.transformOrigin = 'top center';
  }

  function setGalleryZoomOrigin(event) {
    if (!galleryMain) return;
    const image = getActiveGalleryImage();
    if (!image) return;
    const rect = galleryMain.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    image.style.transformOrigin = `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`;
  }

  const lightbox = document.getElementById('pp-lightbox');
  const lightboxImage = document.getElementById('pp-lightbox-image');
  const lightboxStage = document.getElementById('pp-lightbox-stage');
  const lightboxCounter = document.getElementById('pp-lightbox-counter');
  const lightboxThumbs = document.getElementById('pp-lightbox-thumbs');
  const lightboxPrev = document.getElementById('pp-lightbox-prev');
  const lightboxNext = document.getElementById('pp-lightbox-next');
  const lightboxZoomIn = document.getElementById('pp-lightbox-zoom-in');
  const lightboxZoomOut = document.getElementById('pp-lightbox-zoom-out');
  const zoomOpenBtn = document.getElementById('gallery-zoom-open');
  let lightboxOpen = false;
  let lightboxIndex = 0;
  let lightboxZoom = 1;
  let lightboxPanX = 0;
  let lightboxPanY = 0;
  let isDraggingLightbox = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;

  function getGalleryImages() {
    return Array.from(slides).map((slide) => {
      const image = slide.querySelector('.pp-gallery-image');
      if (!image) return null;
      return {
        src: image.getAttribute('data-zoom-src') || image.currentSrc || image.src,
        alt: image.alt || productRoot.dataset.productTitle || 'Product image',
        thumb: image.currentSrc || image.src
      };
    }).filter(Boolean);
  }

  function applyLightboxTransform() {
    if (!lightboxImage) return;
    lightboxImage.style.transformOrigin = 'top center';
    lightboxImage.style.objectFit = 'contain';
    lightboxImage.style.objectPosition = 'top center';
    if (lightboxZoom <= 1 && lightboxPanX === 0 && lightboxPanY === 0) {
      lightboxImage.style.transform = 'none';
    } else {
      lightboxImage.style.transform = `translate(${lightboxPanX}px, ${lightboxPanY}px) scale(${lightboxZoom})`;
    }
    if (lightboxStage) {
      lightboxStage.classList.toggle('is-zoomed', lightboxZoom > 1);
    }
  }

  function resetLightboxZoom() {
    lightboxZoom = 1;
    lightboxPanX = 0;
    lightboxPanY = 0;
    applyLightboxTransform();
  }

  function setLightboxZoom(nextZoom) {
    lightboxZoom = Math.max(1, Math.min(3, nextZoom));
    if (lightboxZoom === 1) {
      lightboxPanX = 0;
      lightboxPanY = 0;
    }
    applyLightboxTransform();
  }

  function renderLightboxThumbs(images) {
    if (!lightboxThumbs) return;
    lightboxThumbs.innerHTML = '';
    if (images.length <= 1) {
      lightboxThumbs.hidden = true;
      return;
    }
    lightboxThumbs.hidden = false;
    images.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pp-lightbox__thumb';
      button.setAttribute('aria-label', `View image ${index + 1}`);
      button.setAttribute('aria-current', index === lightboxIndex ? 'true' : 'false');
      button.innerHTML = `<img src="${item.thumb}" alt="">`;
      button.addEventListener('click', () => showLightboxImage(index));
      lightboxThumbs.appendChild(button);
    });
  }

  function showLightboxImage(index) {
    const images = getGalleryImages();
    if (!images.length || !lightboxImage) return;
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    lightboxIndex = index;
    const item = images[index];
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt;
    resetLightboxZoom();
    if (lightboxCounter) {
      lightboxCounter.textContent = `Image ${index + 1} of ${images.length}`;
      lightboxCounter.hidden = images.length <= 1;
    }
    if (lightboxPrev) lightboxPrev.hidden = images.length <= 1;
    if (lightboxNext) lightboxNext.hidden = images.length <= 1;
    if (lightboxThumbs) {
      lightboxThumbs.querySelectorAll('.pp-lightbox__thumb').forEach((thumb, thumbIndex) => {
        thumb.setAttribute('aria-current', thumbIndex === index ? 'true' : 'false');
      });
    }
    goToSlide(index);
  }

  function syncLightboxHeaderOffset() {
    if (!lightbox) return;
    const headerGroup = document.getElementById('header-group');
    const headerOffset = headerGroup instanceof HTMLElement
      ? Math.round(headerGroup.getBoundingClientRect().height)
      : 0;
    const rootOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pp-header-group-height')) || 0;
    const offset = Math.max(headerOffset, rootOffset, 0);
    lightbox.style.setProperty('--pp-lightbox-header-offset', offset + 'px');
  }

  function openLightbox(startIndex) {
    const images = getGalleryImages();
    if (!images.length || !lightbox || !lightboxImage) return;
    lightboxIndex = typeof startIndex === 'number' ? startIndex : currentSlide;
    syncLightboxHeaderOffset();
    renderLightboxThumbs(images);
    showLightboxImage(lightboxIndex);
    lightbox.hidden = false;
    lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightboxOpen = false;
    resetLightboxZoom();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.documentElement.removeAttribute('scroll-lock');
  }

  thumbs.forEach((thumb) => {
    const thumbIndex = parseInt(thumb.dataset.thumb, 10);
    const opensGallery = thumb.matches('[data-open-gallery], .pp-thumb--more');

    if (prefersHoverSelection && !opensGallery) {
      thumb.addEventListener('mouseenter', () => goToSlide(thumbIndex));
    }

    thumb.addEventListener('focus', () => goToSlide(thumbIndex));
    thumb.addEventListener('click', () => {
      goToSlide(thumbIndex);
      if (opensGallery) openLightbox(thumbIndex);
    });
  });
  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));
  if (galleryMain) {
    galleryMain.setAttribute('tabindex', '0');
    galleryMain.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToSlide(currentSlide - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToSlide(currentSlide + 1);
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(currentSlide);
      }
    });

    if (prefersHoverSelection) {
      galleryMain.addEventListener('mouseenter', (event) => {
        if (event.target.closest('.pp-gallery-arrow, .pp-wishlist-btn, .pp-zoom-hint, .pp-sale-badge')) return;
        galleryMain.classList.add('is-zooming');
        setGalleryZoomOrigin(event);
      });
      galleryMain.addEventListener('mousemove', (event) => {
        if (event.target.closest('.pp-gallery-arrow, .pp-wishlist-btn, .pp-zoom-hint, .pp-sale-badge')) {
          resetGalleryZoom();
          return;
        }
        galleryMain.classList.add('is-zooming');
        setGalleryZoomOrigin(event);
      });
      galleryMain.addEventListener('mouseleave', resetGalleryZoom);
    }

    galleryMain.addEventListener('click', (event) => {
      if (event.target.closest('.pp-gallery-arrow, .pp-wishlist-btn, .pp-zoom-hint, .pp-sale-badge')) return;
      openLightbox(currentSlide);
    });
  }

  if (zoomOpenBtn) {
    zoomOpenBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openLightbox(currentSlide);
    });
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => showLightboxImage(lightboxIndex - 1));
  }
  if (lightboxNext) {
    lightboxNext.addEventListener('click', () => showLightboxImage(lightboxIndex + 1));
  }
  if (lightboxZoomIn) {
    lightboxZoomIn.addEventListener('click', () => setLightboxZoom(lightboxZoom + 0.5));
  }
  if (lightboxZoomOut) {
    lightboxZoomOut.addEventListener('click', () => setLightboxZoom(lightboxZoom - 0.5));
  }

  if (lightboxStage && lightboxImage) {
    let didDragLightbox = false;

    lightboxStage.addEventListener('click', (event) => {
      if (event.target.closest('.pp-lightbox__nav, .pp-lightbox__zoom-btn')) return;
      if (didDragLightbox) {
        didDragLightbox = false;
        return;
      }
      if (lightboxZoom === 1) setLightboxZoom(2);
      else resetLightboxZoom();
    });

    lightboxStage.addEventListener('pointerdown', (event) => {
      if (lightboxZoom <= 1) return;
      isDraggingLightbox = true;
      didDragLightbox = false;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      panStartX = lightboxPanX;
      panStartY = lightboxPanY;
      lightboxStage.classList.add('is-dragging');
      lightboxStage.setPointerCapture(event.pointerId);
    });

    lightboxStage.addEventListener('pointermove', (event) => {
      if (!isDraggingLightbox) return;
      const dx = event.clientX - dragStartX;
      const dy = event.clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragLightbox = true;
      lightboxPanX = panStartX + dx;
      lightboxPanY = panStartY + dy;
      applyLightboxTransform();
    });

    const endDrag = (event) => {
      if (!isDraggingLightbox) return;
      isDraggingLightbox = false;
      lightboxStage.classList.remove('is-dragging');
      try { lightboxStage.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
    };

    lightboxStage.addEventListener('pointerup', endDrag);
    lightboxStage.addEventListener('pointercancel', endDrag);
  }

  if (lightbox) {
    lightbox.querySelectorAll('[data-pp-lightbox-close]').forEach((el) => {
      el.addEventListener('click', closeLightbox);
    });
  }

  window.addEventListener('resize', () => {
    if (lightboxOpen) syncLightboxHeaderOffset();
  });

  document.addEventListener('keydown', (event) => {
    if (!lightboxOpen) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showLightboxImage(lightboxIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showLightboxImage(lightboxIndex + 1);
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setLightboxZoom(lightboxZoom + 0.5);
    }
    if (event.key === '-') {
      event.preventDefault();
      setLightboxZoom(lightboxZoom - 0.5);
    }
  });

  function toggleWishlist(button, event) {
    event.preventDefault();
    event.stopPropagation();
    if (window.PPWishlist) return;
    button.classList.toggle('is-active');
    button.setAttribute('aria-pressed', button.classList.contains('is-active') ? 'true' : 'false');
  }

  // Wishlist is handled by shared PPWishlist module when present.
  if (window.PPWishlist) {
    window.PPWishlist.bindButtons(productRoot);
  } else {
    document.querySelectorAll('.pp-wishlist-btn, .pp-card-wishlist, .pp-wishlist').forEach((button) => {
      button.addEventListener('click', (event) => toggleWishlist(button, event));
    });
  }

  document.addEventListener('pp:wishlist:toggle', (event) => {
    const active = event.detail && event.detail.active;
    showToast(active ? 'Added to wishlist' : 'Removed from wishlist');
  });
  const variantIdInput = document.getElementById('variant-id-input');
  const itemNo = document.getElementById('pp-item-no');
  const specSku = document.getElementById('pp-spec-sku');
  const specVariant = document.getElementById('pp-spec-variant');
  const specAvailability = document.getElementById('pp-spec-availability');
  const priceCurrent = document.getElementById('pp-price-current');
  const priceCompare = document.getElementById('pp-price-compare');
  const priceSave = document.getElementById('pp-save-pill');
  const stickyPrice = document.getElementById('sticky-price');
  const saleBadge = document.querySelector('.pp-sale-badge:not(.pp-sale-badge--bestseller)');
  const productForm = document.getElementById('product-form');
  const addToCartBtn = document.getElementById('add-to-cart');
  const qtyInput = document.getElementById('qty-input');
  const qtyHidden = document.getElementById('qty-hidden');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const toast = document.getElementById('toast');
  const rootUrl = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';
  let qty = 1;
  let toastTimer = null;

  function getMeaningfulSelectionLabel() {
    return selection.filter((value) => value && value !== 'Default Title').join(' / ');
  }

  function syncVariantDetails(variant) {
    if (!variant) return;

    if (variantIdInput) variantIdInput.value = variant.id;
    if (itemNo) itemNo.textContent = variant.sku || productData.title;
    if (specSku) specSku.textContent = variant.sku || productData.title;
    if (specVariant) specVariant.textContent = getMeaningfulSelectionLabel();
    if (specAvailability) specAvailability.textContent = variant.available ? 'In stock' : 'Sold out';
    if (priceCurrent) priceCurrent.textContent = variant.price;
    if (stickyPrice) stickyPrice.textContent = variant.price;

    const installmentsEl = document.getElementById('pp-installments');
    if (installmentsEl && typeof variant.priceValue === 'number') {
      const installment = (variant.priceValue / 4 / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const currencyMatch = String(variant.price || '').match(/^[^\d]*/);
      const prefix = currencyMatch ? currencyMatch[0] : '$';
      installmentsEl.textContent = `Or 4 payments of ${prefix}${installment}`;
    }

    const stockLine = document.getElementById('pp-stock-line');
    if (stockLine) {
      stockLine.textContent = 'In stock, ready to ship';
      stockLine.classList.add('is-in');
      stockLine.classList.remove('is-out');
    }

    if (productData?.saleTagged && variant.compareAtPrice && variant.compareAtPrice !== variant.price) {
      if (priceCompare) {
        priceCompare.hidden = false;
        priceCompare.textContent = variant.compareAtPrice;
      }
      if (priceSave) {
        priceSave.hidden = false;
        priceSave.textContent = `Save ${variant.savingsMoney}`;
      }
      if (saleBadge) saleBadge.hidden = false;
    } else {
      if (priceCompare) priceCompare.hidden = true;
      if (priceSave) priceSave.hidden = true;
      if (saleBadge) saleBadge.hidden = true;
    }

    const atc = document.getElementById('add-to-cart');
    const stickyAtc = document.getElementById('sticky-atc');
    const buyNow = document.getElementById('buy-now');
    const soldOut = variant.available === false;
    if (atc) {
      atc.disabled = false;
      atc.classList.toggle('pp-atc--soldout', soldOut);
      atc.textContent = soldOut ? 'Sold out' : 'Add to cart';
    }
    if (stickyAtc) {
      stickyAtc.disabled = false;
      stickyAtc.classList.toggle('pp-atc--soldout', soldOut);
      const stickyLabel = document.getElementById('sticky-atc-label');
      if (stickyLabel) stickyLabel.textContent = soldOut ? 'Sold out' : 'Add to Cart';
    }
    if (buyNow) buyNow.disabled = false;

    if (variant.featuredMediaId) {
      const targetIndex = Array.from(slides).findIndex((slide) => String(slide.dataset.mediaId) === String(variant.featuredMediaId));
      if (targetIndex >= 0) goToSlide(targetIndex);
    }
  }

  function findMatchingVariant() {
    if (!productData || !productData.variants) return null;
    return productData.variants.find((variant) => {
      if (!Array.isArray(variant.options)) return false;
      return variant.options.every((option, index) => option === selection[index]);
    }) || productData.variants[0];
  }

  variantGroups.forEach((group, groupIndex) => {
    group.querySelectorAll('.pp-variant-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.pp-variant-pill').forEach((button) => {
          button.classList.remove('is-selected');
          button.setAttribute('aria-pressed', 'false');
        });
        pill.classList.add('is-selected');
        pill.setAttribute('aria-pressed', 'true');
        const optionPosition = Number(group.dataset.optionPosition || pill.dataset.optionPosition || groupIndex + 1);
        selection[optionPosition - 1] = pill.dataset.variantValue;
        if (selectionText) selectionText.textContent = getMeaningfulSelectionLabel();
        syncVariantDetails(findMatchingVariant());
      });
    });
  });

  function updateQty(newQty) {
    qty = Math.max(1, Math.min(99, Number.isFinite(newQty) ? newQty : 1));
    if (qtyInput) qtyInput.textContent = String(qty);
    if (qtyHidden) qtyHidden.value = String(qty);
    if (qtyMinus) qtyMinus.disabled = qty <= 1;
  }

  updateQty(1);

  if (qtyMinus) qtyMinus.addEventListener('click', () => updateQty(qty - 1));
  if (qtyPlus) {
    qtyPlus.addEventListener('click', () => {
      updateQty(qty + 1);
      qtyPlus.classList.add('is-pulsing');
      setTimeout(() => qtyPlus.classList.remove('is-pulsing'), 240);
    });
  }

  function showToast(message, type = 'success') {
    if (!toast) return;
    const icon = type === 'error'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    toast.innerHTML = `${icon}<span>${message}</span>`;
    toast.classList.toggle('is-error', type === 'error');
    toast.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  function popHeaderCart() {
    const cartButtons = document.querySelectorAll('.pp-header__cart, .pp-cart-btn, [data-cart-drawer-trigger]');
    cartButtons.forEach((button) => {
      button.classList.add('is-adding');
      window.setTimeout(() => button.classList.remove('is-adding'), 800);
    });

    const cartDrawer = document.querySelector('cart-drawer-component');
    if (cartDrawer && typeof cartDrawer.open === 'function') {
      cartDrawer.open();
      return;
    }

    const trigger = document.querySelector('[data-cart-drawer-trigger]');
    if (trigger) trigger.click();
  }

  async function refreshCartCount(eventData = {}) {
    const response = await fetch(`${rootUrl}cart.js`, {
      headers: { Accept: 'application/json' }
    });
    const cart = await response.json();
    document.querySelectorAll('.pp-header-cart-count').forEach((countEl) => {
      countEl.textContent = cart.item_count;
      countEl.setAttribute('aria-label', `${cart.item_count} item${cart.item_count === 1 ? '' : 's'} in cart`);
    });
    document.querySelectorAll('.pp-header__cart, .pp-cart-btn').forEach((cartButton) => {
      cartButton.setAttribute('data-count', String(cart.item_count));
      cartButton.setAttribute('aria-label', `Cart - ${cart.item_count} item${cart.item_count === 1 ? '' : 's'}`);
    });
    document.dispatchEvent(new CustomEvent('cart:update', {
      bubbles: true,
      detail: {
        resource: cart,
        data: eventData
      }
    }));
    return cart;
  }

  async function submitAddToCart() {
    const matchingVariant = findMatchingVariant();
    if (!matchingVariant) return;

    if (variantIdInput) variantIdInput.value = matchingVariant.id;
    updateQty(qty);

    const formData = new FormData();
    formData.append('id', String(matchingVariant.id));
    formData.append('quantity', String(qty));

    const sectionIds = Array.from(document.querySelectorAll('cart-items-component'))
      .map((component) => component instanceof HTMLElement ? component.dataset.sectionId : null)
      .filter(Boolean);

    if (sectionIds.length) {
      formData.append('sections', sectionIds.join(','));
      formData.append('sections_url', window.location.pathname);
    }

    if (addToCartBtn) addToCartBtn.disabled = true;
    if (stickyAtc) stickyAtc.disabled = true;

    try {
      const response = await fetch(`${rootUrl}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData?.description || responseData?.message || 'Unable to add to cart');
      }

      await refreshCartCount({
        source: 'pp-product-form',
        sections: responseData?.sections || {}
      });
      popHeaderCart();
      showToast('Added to cart');
    } catch (error) {
      showToast(error.message || 'Unable to add to cart', 'error');
    } finally {
      syncVariantDetails(findMatchingVariant());
    }
  }

  if (productForm) {
    productForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      await submitAddToCart();
    });
  }

  const stickyAtc = document.getElementById('sticky-atc');
  if (stickyAtc) {
    stickyAtc.addEventListener('click', async () => {
      await submitAddToCart();
    });
  }

  const copyLinkBtn = document.getElementById('copy-link-btn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      if (navigator.clipboard && window.location.href) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast('Link copied to clipboard');
        }).catch(() => showToast('Link copied'));
      } else {
        showToast('Link copied');
      }
    });
  }

  const tabButtons = document.querySelectorAll('.pp-tab');
  const tabPanels  = document.querySelectorAll('.pp-tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('aria-controls');

      tabButtons.forEach(b => {
        const isActive = b === btn;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        b.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      tabPanels.forEach(p => {
        const isTarget = p.id === targetId;
        p.classList.toggle('is-active', isTarget);
        if (isTarget) {
          p.removeAttribute('hidden');
        } else {
          p.setAttribute('hidden', '');
        }
      });
    });

    btn.addEventListener('keydown', (e) => {
      const list = Array.from(tabButtons);
      const idx = list.indexOf(btn);
      let next = null;
      if (e.key === 'ArrowRight') next = list[(idx + 1) % list.length];
      if (e.key === 'ArrowLeft')  next = list[(idx - 1 + list.length) % list.length];
      if (next) { next.focus(); next.click(); }
    });
  });

  document.querySelectorAll('a[href="#reviews"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const reviews = document.getElementById('reviews');
      if (!reviews) return;
      e.preventDefault();
      reviews.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const stickyBar = document.getElementById('sticky-bar');
  const atcBtn = document.getElementById('add-to-cart');
  if ('IntersectionObserver' in window && stickyBar && atcBtn) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (window.innerWidth >= 768) {
          stickyBar.classList.remove('is-visible');
          return;
        }
        if (!entry.isIntersecting) stickyBar.classList.add('is-visible');
        else stickyBar.classList.remove('is-visible');
      });
    }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
    observer.observe(atcBtn);
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && stickyBar) stickyBar.classList.remove('is-visible');
  });

  const reviewsLink = document.getElementById('reviews-link');
  if (reviewsLink) {
    reviewsLink.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.getElementById('reviews');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  document.querySelectorAll('[data-related-url]').forEach((container) => {
    const url = container.getAttribute('data-related-url');
    if (!url) return;

    fetch(url, { headers: { Accept: 'text/html' } })
      .then((response) => response.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const replacement = doc.querySelector('.pp-recommend');
        if (!replacement || replacement.classList.contains('pp-recommend--loading')) {
          container.remove();
          return;
        }
        container.replaceWith(replacement);
      })
      .catch(() => {
        container.remove();
      });
  });

  document.addEventListener('click', async (event) => {
    const wishlistButton = event.target.closest('.pp-wishlist, .pp-wishlist-btn, [data-pp-wishlist]');
    if (wishlistButton) {
      if (window.PPWishlist) return;
      toggleWishlist(wishlistButton, event);
      return;
    }

    const button = event.target.closest('.pp-quickadd[data-quick-add-variant-id]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const variantId = button.getAttribute('data-quick-add-variant-id');
    if (!variantId) return;

    try {
      const response = await fetch(`${rootUrl}cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] })
      });
      if (!response.ok) throw new Error('Unable to add to cart');
      button.classList.add('is-added');
      await refreshCartCount();
      popHeaderCart();
      showToast('Added to cart');
      window.setTimeout(() => button.classList.remove('is-added'), 1400);
    } catch (error) {
      showToast(error.message || 'Unable to add to cart', 'error');
    }
  });

  syncVariantDetails(findMatchingVariant());

  document.querySelectorAll('[data-pp-copy-link]').forEach((button) => {
    button.addEventListener('click', async () => {
      const url = button.getAttribute('data-url') || window.location.href;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const input = document.createElement('input');
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          input.remove();
        }
        showToast('Link copied');
      } catch (error) {
        showToast('Unable to copy link', 'error');
      }
    });
  });

  document.querySelectorAll('[data-pp-rating-hover]').forEach(function (wrap) {
    wrap.addEventListener('click', function (event) {
      if (event.target.closest('.pp-rating-link, .pp-hist__link')) return;
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        wrap.classList.toggle('is-open');
      }
    });
    document.addEventListener('click', function (event) {
      if (!wrap.contains(event.target)) wrap.classList.remove('is-open');
    });
    wrap.addEventListener('mouseenter', function () {
      wrap.classList.remove('is-hidden');
    });
    wrap.addEventListener('focusin', function () {
      wrap.classList.remove('is-hidden');
    });
  });

  window.addEventListener('scroll', function () {
    document.querySelectorAll('[data-pp-rating-hover]').forEach(function (wrap) {
      wrap.classList.remove('is-open');
      wrap.classList.add('is-hidden');
    });
  }, { passive: true });

  const postcodeInput = document.querySelector('[data-pp-postcode]');
  const postcodeCheck = document.querySelector('[data-pp-postcode-check]');
  const postcodeResult = document.querySelector('[data-pp-postcode-result]');
  if (postcodeInput && postcodeCheck && postcodeResult) {
    const knownPlaces = {
      '0800': { suburb: 'Darwin', state: 'NT', speed: 'remote' },
      '2000': { suburb: 'Sydney', state: 'NSW', speed: 'metro' },
      '2010': { suburb: 'Surry Hills', state: 'NSW', speed: 'metro' },
      '2026': { suburb: 'Bondi', state: 'NSW', speed: 'metro' },
      '2060': { suburb: 'North Sydney', state: 'NSW', speed: 'metro' },
      '2088': { suburb: 'Mosman', state: 'NSW', speed: 'metro' },
      '2112': { suburb: 'Ryde', state: 'NSW', speed: 'metro' },
      '2148': { suburb: 'Blacktown', state: 'NSW', speed: 'metro' },
      '2150': { suburb: 'Parramatta', state: 'NSW', speed: 'metro' },
      '2170': { suburb: 'Liverpool', state: 'NSW', speed: 'metro' },
      '2250': { suburb: 'Gosford', state: 'NSW', speed: 'regional' },
      '2300': { suburb: 'Newcastle', state: 'NSW', speed: 'regional' },
      '2450': { suburb: 'Coffs Harbour', state: 'NSW', speed: 'regional' },
      '2480': { suburb: 'Lismore', state: 'NSW', speed: 'regional' },
      '2500': { suburb: 'Wollongong', state: 'NSW', speed: 'regional' },
      '2600': { suburb: 'Canberra', state: 'ACT', speed: 'metro' },
      '2617': { suburb: 'Belconnen', state: 'ACT', speed: 'metro' },
      '2640': { suburb: 'Albury', state: 'NSW', speed: 'regional' },
      '2650': { suburb: 'Wagga Wagga', state: 'NSW', speed: 'regional' },
      '2747': { suburb: 'Kingswood', state: 'NSW', speed: 'metro' },
      '2750': { suburb: 'Penrith', state: 'NSW', speed: 'metro' },
      '2760': { suburb: 'St Marys', state: 'NSW', speed: 'metro' },
      '2761': { suburb: 'Plumpton', state: 'NSW', speed: 'metro' },
      '2762': { suburb: 'Schofields', state: 'NSW', speed: 'metro' },
      '2763': { suburb: 'Acacia Gardens', state: 'NSW', speed: 'metro' },
      '2768': { suburb: 'Glenwood', state: 'NSW', speed: 'metro' },
      '2770': { suburb: 'Mount Druitt', state: 'NSW', speed: 'metro' },
      '2830': { suburb: 'Dubbo', state: 'NSW', speed: 'regional' },
      '2880': { suburb: 'Broken Hill', state: 'NSW', speed: 'remote' },
      '3000': { suburb: 'Melbourne', state: 'VIC', speed: 'metro' },
      '3053': { suburb: 'Carlton', state: 'VIC', speed: 'metro' },
      '3121': { suburb: 'Richmond', state: 'VIC', speed: 'metro' },
      '3141': { suburb: 'South Yarra', state: 'VIC', speed: 'metro' },
      '3168': { suburb: 'Clayton', state: 'VIC', speed: 'metro' },
      '3220': { suburb: 'Geelong', state: 'VIC', speed: 'regional' },
      '3350': { suburb: 'Ballarat', state: 'VIC', speed: 'regional' },
      '3550': { suburb: 'Bendigo', state: 'VIC', speed: 'regional' },
      '4000': { suburb: 'Brisbane', state: 'QLD', speed: 'metro' },
      '4101': { suburb: 'South Brisbane', state: 'QLD', speed: 'metro' },
      '4215': { suburb: 'Southport', state: 'QLD', speed: 'metro' },
      '4217': { suburb: 'Surfers Paradise', state: 'QLD', speed: 'metro' },
      '4305': { suburb: 'Ipswich', state: 'QLD', speed: 'metro' },
      '4350': { suburb: 'Toowoomba', state: 'QLD', speed: 'regional' },
      '4558': { suburb: 'Sunshine Coast', state: 'QLD', speed: 'regional' },
      '4700': { suburb: 'Rockhampton', state: 'QLD', speed: 'regional' },
      '4810': { suburb: 'Townsville', state: 'QLD', speed: 'regional' },
      '4870': { suburb: 'Cairns', state: 'QLD', speed: 'regional' },
      '5000': { suburb: 'Adelaide', state: 'SA', speed: 'metro' },
      '5031': { suburb: 'Mile End', state: 'SA', speed: 'metro' },
      '5290': { suburb: 'Mount Gambier', state: 'SA', speed: 'regional' },
      '5700': { suburb: 'Port Augusta', state: 'SA', speed: 'remote' },
      '6000': { suburb: 'Perth', state: 'WA', speed: 'metro' },
      '6008': { suburb: 'Subiaco', state: 'WA', speed: 'metro' },
      '6050': { suburb: 'Mount Lawley', state: 'WA', speed: 'metro' },
      '6160': { suburb: 'Fremantle', state: 'WA', speed: 'metro' },
      '6430': { suburb: 'Kalgoorlie', state: 'WA', speed: 'remote' },
      '7000': { suburb: 'Hobart', state: 'TAS', speed: 'metro' },
      '7250': { suburb: 'Launceston', state: 'TAS', speed: 'regional' }
    };

    const auStates = {
      NSW: 'New South Wales',
      VIC: 'Victoria',
      QLD: 'Queensland',
      SA: 'South Australia',
      WA: 'Western Australia',
      TAS: 'Tasmania',
      NT: 'Northern Territory',
      ACT: 'Australian Capital Territory'
    };

    function resolvePlace(code) {
      if (knownPlaces[code]) return knownPlaces[code];
      const number = Number(code);
      if (Number.isNaN(number)) return null;
      if (number >= 800 && number <= 999) {
        return { suburb: 'Northern Territory', state: 'NT', speed: number <= 822 ? 'regional' : 'remote' };
      }
      if (number >= 2000 && number <= 2234) return { suburb: 'Sydney', state: 'NSW', speed: 'metro' };
      if (number >= 2235 && number <= 2550) return { suburb: 'NSW coast', state: 'NSW', speed: 'regional' };
      if (number >= 2551 && number <= 2579) return { suburb: 'South West Sydney', state: 'NSW', speed: 'metro' };
      if (number >= 2580 && number <= 2739) return { suburb: 'Regional NSW', state: 'NSW', speed: 'regional' };
      if (number >= 2740 && number <= 2786) return { suburb: 'Western Sydney', state: 'NSW', speed: 'metro' };
      if (number >= 2787 && number <= 2899) return { suburb: 'Regional NSW', state: 'NSW', speed: 'regional' };
      if (number >= 2600 && number <= 2618) return { suburb: 'Canberra', state: 'ACT', speed: 'metro' };
      if (number >= 2900 && number <= 2920) return { suburb: 'Canberra', state: 'ACT', speed: 'metro' };
      if (number >= 3000 && number <= 3207) return { suburb: 'Melbourne', state: 'VIC', speed: 'metro' };
      if (number >= 3208 && number <= 3999) return { suburb: 'Regional Victoria', state: 'VIC', speed: 'regional' };
      if (number >= 4000 && number <= 4179) return { suburb: 'Brisbane', state: 'QLD', speed: 'metro' };
      if (number >= 4200 && number <= 4228) return { suburb: 'Gold Coast', state: 'QLD', speed: 'metro' };
      if (number >= 4300 && number <= 4999) return { suburb: 'Regional Queensland', state: 'QLD', speed: number >= 4800 ? 'remote' : 'regional' };
      if (number >= 5000 && number <= 5114) return { suburb: 'Adelaide', state: 'SA', speed: 'metro' };
      if (number >= 5115 && number <= 5999) return { suburb: 'Regional South Australia', state: 'SA', speed: number >= 5600 ? 'remote' : 'regional' };
      if (number >= 6000 && number <= 6160) return { suburb: 'Perth', state: 'WA', speed: 'metro' };
      if (number >= 6161 && number <= 6999) return { suburb: 'Regional Western Australia', state: 'WA', speed: number >= 6400 ? 'remote' : 'regional' };
      if (number >= 7000 && number <= 7019) return { suburb: 'Hobart', state: 'TAS', speed: 'metro' };
      if (number >= 7020 && number <= 7999) return { suburb: 'Regional Tasmania', state: 'TAS', speed: 'regional' };
      return null;
    }

    function setResult(html, state) {
      postcodeResult.hidden = false;
      postcodeResult.classList.remove('is-loading', 'is-error', 'is-ok');
      if (state) postcodeResult.classList.add(state);
      postcodeResult.innerHTML = html;
    }

    function formatMoney(price) {
      const value = Number(price);
      if (!Number.isFinite(value) || value <= 0) return 'Free';
      return value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    }

    function formatIsoDate(iso) {
      if (!iso) return '';
      const date = new Date(`${String(iso).slice(0, 10)}T12:00:00+10:00`);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Australia/Sydney'
      });
    }

    function rateTiming(rate) {
      const range = Array.isArray(rate.delivery_range) ? rate.delivery_range.filter(Boolean) : [];
      if (range.length >= 2) {
        const start = formatIsoDate(range[0]);
        const end = formatIsoDate(range[1]);
        if (start && end) return start === end ? `Arrives ${start}` : `Arrives ${start} – ${end}`;
      }
      if (range.length === 1) {
        const start = formatIsoDate(range[0]);
        if (start) return `Arrives ${start}`;
      }
      const days = Array.isArray(rate.delivery_days) ? rate.delivery_days : [];
      if (days.length >= 2 && days[0] != null && days[1] != null) {
        if (Number(days[0]) === Number(days[1])) {
          return `${days[0]} business day${Number(days[0]) === 1 ? '' : 's'}`;
        }
        return `${days[0]}–${days[1]} business days`;
      }
      return '';
    }

    async function readCart() {
      const response = await fetch(`${rootUrl}cart.js`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Unable to read the cart.');
      return response.json();
    }

    async function addEstimateItem(variantId) {
      const response = await fetch(`${rootUrl}cart/add.js`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: [{
            id: Number(variantId),
            quantity: 1,
            properties: { _pp_estimate: '1' }
          }]
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.description || data.message || 'This product cannot be quoted for shipping.');
      }
      return data;
    }

    async function removeEstimateItem() {
      const cart = await readCart();
      const line = (cart.items || []).find((item) => item.properties && String(item.properties._pp_estimate) === '1');
      if (!line) return;
      await fetch(`${rootUrl}cart/change.js`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: line.key, quantity: 0 })
      });
    }

    function errorMessage(data) {
      const raw = data && (data.error || data.description || data.message);
      if (!raw) return '';
      if (typeof raw === 'string') return raw;
      if (typeof raw.message === 'string') return raw.message;
      return '';
    }

    async function fetchShippingRates(code, place) {
      const params = new URLSearchParams({
        'shipping_address[country]': 'Australia',
        'shipping_address[country_code]': 'AU',
        'shipping_address[zip]': code,
        'shipping_address[province]': auStates[place.state] || '',
        'shipping_address[city]': place.suburb || ''
      });
      const url = `${rootUrl}cart/shipping_rates.json?${params.toString()}`;
      let lastError = '';

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const response = await fetch(url, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        const data = await response.json().catch(() => ({}));
        if (Array.isArray(data.shipping_rates) && data.shipping_rates.length) {
          return data.shipping_rates;
        }
        lastError = errorMessage(data);
        if (lastError && attempt >= 3) break;
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      }

      if (lastError) throw new Error(lastError);
      return [];
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function renderRates(rates, place, code) {
      const items = rates.map((rate) => {
        const name = escapeHtml(rate.presentment_name || rate.name || 'Shipping');
        const when = rateTiming(rate);
        return (
          `<li class="pp-delivery__rate">` +
            `<span class="pp-delivery__eta">${name} · ${formatMoney(rate.price)}</span>` +
            (when ? `<span class="pp-delivery__when">${escapeHtml(when)}</span>` : '') +
          `</li>`
        );
      }).join('');

      return (
        `<ul class="pp-delivery__rates">${items}</ul>` +
        `<span class="pp-delivery__place">${escapeHtml(place.suburb)} ${escapeHtml(place.state)} ${escapeHtml(code)}</span>`
      );
    }

    let estimateBusy = false;
    const showDeliveryEstimate = async () => {
      const code = String(postcodeInput.value || '').replace(/\D/g, '').slice(0, 4);
      postcodeInput.value = code;

      if (estimateBusy) return;

      if (code.length !== 4) {
        setResult('Enter a 4 digit Australian postcode.', 'is-error');
        return;
      }

      const place = resolvePlace(code);
      if (!place) {
        setResult('We could not match that postcode. Try a nearby Australian postcode.', 'is-error');
        return;
      }

      const variant = findMatchingVariant();
      if (!variant || !variant.id) {
        setResult('Select a product option first, then check delivery.', 'is-error');
        return;
      }

      estimateBusy = true;
      postcodeCheck.disabled = true;
      setResult(`Checking shipping to ${code}…`, 'is-loading');

      let addedEstimateItem = false;
      try {
        const cart = await readCart();
        const alreadyInCart = (cart.items || []).some((item) => Number(item.variant_id) === Number(variant.id) && Number(item.quantity) > 0);
        if (!alreadyInCart) {
          await addEstimateItem(variant.id);
          addedEstimateItem = true;
        }

        const rates = await fetchShippingRates(code, place);
        if (!rates.length) {
          setResult('No shipping methods are available for this postcode.', 'is-error');
        } else {
          setResult(renderRates(rates, place, code), 'is-ok');
        }
      } catch (error) {
        setResult(error.message || 'Unable to check shipping for this postcode.', 'is-error');
      } finally {
        if (addedEstimateItem) {
          try {
            await removeEstimateItem();
          } catch (error) {
            /* leave the cart as-is if cleanup fails */
          }
        }
        estimateBusy = false;
        postcodeCheck.disabled = false;
      }
    };

    postcodeInput.addEventListener('input', () => {
      postcodeInput.value = String(postcodeInput.value || '').replace(/\D/g, '').slice(0, 4);
    });
    postcodeCheck.addEventListener('click', showDeliveryEstimate);
    postcodeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        showDeliveryEstimate();
      }
    });
  }

  syncGalleryRatio();
})();
