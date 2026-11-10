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

  // "1 / 8" badge on the main image (shown on phones, where the arrows are hidden).
  let galleryCount = null;
  if (galleryMain && slides.length > 1) {
    galleryCount = document.createElement('span');
    galleryCount.className = 'pp-gallery-count';
    galleryCount.setAttribute('aria-hidden', 'true');
    galleryCount.textContent = `1 / ${slides.length}`;
    galleryMain.appendChild(galleryCount);
  }

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
    if (galleryCount) galleryCount.textContent = `${idx + 1} / ${slides.length}`;
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

    // Swipe left / right on the main image to change picture. Vertical swipes
    // still scroll the page, and a swipe does not open the lightbox.
    let swipeStart = null;
    let didSwipe = false;
    galleryMain.addEventListener('touchstart', (event) => {
      if (slides.length < 2 || event.touches.length !== 1) {
        swipeStart = null;
        return;
      }
      const touch = event.touches[0];
      swipeStart = { x: touch.clientX, y: touch.clientY };
      didSwipe = false;
    }, { passive: true });
    galleryMain.addEventListener('touchend', (event) => {
      if (!swipeStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - swipeStart.x;
      const dy = touch.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      didSwipe = true;
      goToSlide(currentSlide + (dx < 0 ? 1 : -1));
    }, { passive: true });
    galleryMain.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });

    galleryMain.addEventListener('click', (event) => {
      if (event.target.closest('.pp-gallery-arrow, .pp-wishlist-btn, .pp-zoom-hint, .pp-sale-badge')) return;
      if (didSwipe) {
        didSwipe = false;
        return;
      }
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
    const inStock = variant.inStock !== false && variant.available !== false;
    if (specAvailability) specAvailability.textContent = inStock ? 'In stock' : 'Sold out';
    if (priceCurrent) priceCurrent.textContent = variant.price;
    if (stickyPrice) stickyPrice.textContent = variant.price;

    const stockLine = document.getElementById('pp-stock-line');
    if (stockLine) {
      stockLine.textContent = inStock ? 'In stock, ready to ship' : 'Sold out';
      stockLine.classList.toggle('is-in', inStock);
      stockLine.classList.toggle('is-out', !inStock);
    }

    const offerLine = document.getElementById('pp-offer-line');
    const variantOnSale =
      typeof variant.compareAtPriceValue === 'number' &&
      variant.compareAtPriceValue > variant.priceValue;
    if (variantOnSale) {
      if (priceCompare) {
        priceCompare.hidden = false;
        priceCompare.textContent = variant.compareAtPrice;
      }
      if (priceSave) {
        priceSave.hidden = false;
        priceSave.textContent = `${variant.percentOff}% off`;
      }
      if (offerLine) offerLine.hidden = false;
      if (saleBadge) saleBadge.hidden = false;
    } else {
      if (priceCompare) priceCompare.hidden = true;
      if (priceSave) priceSave.hidden = true;
      if (offerLine) offerLine.hidden = true;
      if (saleBadge) saleBadge.hidden = true;
    }

    const atc = document.getElementById('add-to-cart');
    const stickyAtc = document.getElementById('sticky-atc');
    const buyNowWrap = document.getElementById('pp-buy-now-wrap');
    const soldOut = !inStock;
    if (atc) {
      atc.disabled = soldOut;
      atc.classList.toggle('pp-atc--soldout', soldOut);
      const atcLabel = document.getElementById('add-to-cart-label');
      if (atcLabel) atcLabel.textContent = soldOut ? 'Sold out' : 'Add to cart';
      else atc.textContent = soldOut ? 'Sold out' : 'Add to cart';
    }
    if (stickyAtc) {
      stickyAtc.disabled = soldOut;
      stickyAtc.classList.toggle('pp-atc--soldout', soldOut);
      const stickyLabel = document.getElementById('sticky-atc-label');
      if (stickyLabel) stickyLabel.textContent = soldOut ? 'Sold out' : 'Add to Cart';
    }
    if (buyNowWrap) buyNowWrap.hidden = soldOut;

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
        updateQty(qty);
      });
    });
  });

  // How many more of the selected variant can go in the cart: its stock or
  // quantity limit minus what is already there. 99 when there is no limit.
  function addableQty() {
    const variant = findMatchingVariant();
    if (!variant || typeof variant.maxQty !== 'number') return 99;
    return Math.max(0, Math.min(99, variant.maxQty - (Number(variant.inCart) || 0)));
  }

  function updateQty(newQty) {
    const limit = Math.max(1, addableQty());
    qty = Math.max(1, Math.min(limit, Number.isFinite(newQty) ? newQty : 1));
    if (qtyInput) qtyInput.textContent = String(qty);
    if (qtyHidden) qtyHidden.value = String(qty);
    if (qtyMinus) qtyMinus.disabled = qty <= 1;
    if (qtyPlus) qtyPlus.disabled = qty >= limit;
  }

  // Keep each variant's in-cart count current after the cart changes.
  function syncInCart(cart) {
    if (!cart || !Array.isArray(cart.items) || !productData || !productData.variants) return;
    productData.variants.forEach((variant) => {
      variant.inCart = cart.items
        .filter((item) => Number(item.variant_id) === Number(variant.id))
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    });
    updateQty(qty);
  }

  document.addEventListener('cart:update', (event) => {
    const cart = event.detail && event.detail.resource;
    if (cart && Array.isArray(cart.items)) {
      syncInCart(cart);
    } else {
      fetch(`${rootUrl}cart.js`, { headers: { Accept: 'application/json' } })
        .then((response) => response.json())
        .then(syncInCart)
        .catch(() => {});
    }
  });

  updateQty(1);

  if (qtyMinus) qtyMinus.addEventListener('click', () => updateQty(qty - 1));
  if (qtyPlus) {
    qtyPlus.addEventListener('click', () => {
      if (qty >= addableQty()) return;
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
    // The cart badge counts different products (cart lines), not total quantity.
    const productCount = Array.isArray(cart.items) ? cart.items.length : 0;
    document.querySelectorAll('.pp-header-cart-count').forEach((countEl) => {
      countEl.textContent = productCount;
      countEl.setAttribute('aria-label', `${productCount} item${productCount === 1 ? '' : 's'} in cart`);
    });
    document.querySelectorAll('.pp-header__cart, .pp-cart-btn').forEach((cartButton) => {
      cartButton.setAttribute('data-count', String(productCount));
      cartButton.setAttribute('aria-label', `Cart - ${productCount} item${productCount === 1 ? '' : 's'}`);
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

  // Button feedback while adding: a spinner, then "Added to cart" for a
  // moment. Classes only, since syncVariantDetails rewrites the label text.
  let atcStateTimer = null;
  function setAtcState(state) {
    [addToCartBtn, document.getElementById('sticky-atc')].forEach((button) => {
      if (!button) return;
      button.classList.toggle('is-loading', state === 'loading');
      button.classList.toggle('is-added', state === 'added');
    });
    if (atcStateTimer) clearTimeout(atcStateTimer);
    if (state === 'added') atcStateTimer = setTimeout(() => setAtcState(''), 1800);
  }

  async function submitAddToCart() {
    const matchingVariant = findMatchingVariant();
    if (!matchingVariant) return;
    if (matchingVariant.inStock === false || matchingVariant.available === false) {
      syncVariantDetails(matchingVariant);
      return;
    }

    if (variantIdInput) variantIdInput.value = matchingVariant.id;
    if (addableQty() < 1) {
      showToast(`You already have all ${matchingVariant.maxQty} available in your cart`, 'error');
      return;
    }
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
    setAtcState('loading');

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
      setAtcState('added');
      popHeaderCart();
      showToast('Added to cart');
    } catch (error) {
      setAtcState('');
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

  // Scroll to the reviews and keep aiming at them for a few seconds: sections
  // above (recommendations, the reviews widget itself) load while the page
  // scrolls and change height, which used to leave the shopper at the footer.
  // Watches for 8 seconds, enough for a slow phone connection.
  // Stops as soon as the shopper scrolls themselves.
  function scrollToReviews() {
    const reviews = document.getElementById('reviews');
    if (!reviews) return;

    // Stop below the fixed header so it doesn't cover the reviews heading.
    const headerGroup = document.getElementById('header-group');
    const headerFixed = headerGroup && ['fixed', 'sticky'].includes(getComputedStyle(headerGroup).position);
    reviews.style.scrollMarginTop = `${(headerFixed ? headerGroup.offsetHeight : 0) + 16}px`;

    const pageTop = () => reviews.getBoundingClientRect().top + window.scrollY;
    let lastTop = pageTop();
    const userEvents = ['wheel', 'touchstart', 'keydown'];
    const check = window.setInterval(() => {
      const top = pageTop();
      if (Math.abs(top - lastTop) < 2) return;
      lastTop = top;
      reviews.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    const stop = () => {
      window.clearInterval(check);
      window.clearTimeout(timeout);
      userEvents.forEach((type) => window.removeEventListener(type, stop));
    };
    const timeout = window.setTimeout(stop, 8000);

    userEvents.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    reviews.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('a[href="#reviews"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!document.getElementById('reviews')) return;
      event.preventDefault();
      scrollToReviews();
    });
  });

  // Sticky "Add to cart" bar (phones): it appears once the main Add to cart button
  // has scrolled up past the top of the screen, not while the button is still
  // further down the page, and it is hidden again when the shopper scrolls back up.
  const stickyBar = document.getElementById('sticky-bar');
  const atcBtn = document.getElementById('add-to-cart');
  if (stickyBar && atcBtn) {
    const updateStickyBar = () => {
      const show = window.innerWidth < 768 && atcBtn.getBoundingClientRect().bottom < 0;
      stickyBar.classList.toggle('is-visible', show);
    };
    window.addEventListener('scroll', updateStickyBar, { passive: true });
    window.addEventListener('resize', updateStickyBar);
    updateStickyBar();
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

    const button = event.target.closest('button[data-quick-add-variant-id]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const variantId = button.getAttribute('data-quick-add-variant-id');
    if (!variantId || button.classList.contains('is-loading')) return;

    button.classList.add('is-loading');
    try {
      const response = await fetch(`${rootUrl}cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] })
      });
      if (!response.ok) throw new Error('Unable to add to cart');
      button.classList.remove('is-loading');
      button.classList.add('is-added');
      await refreshCartCount();
      popHeaderCart();
      showToast('Added to cart');
      window.setTimeout(() => button.classList.remove('is-added'), 1800);
    } catch (error) {
      button.classList.remove('is-loading');
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

  syncGalleryRatio();
})();
