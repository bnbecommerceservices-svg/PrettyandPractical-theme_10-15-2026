# Judge.me reviews in the Pretty & Practical theme

How product reviews are wired into this theme, what each file does, and how to
diagnose the problems we have seen. Keep this file up to date whenever the
reviews setup, Judge.me's code or the store's Judge.me settings change.

Last updated: 9 November 2026.

## How the review widget gets onto a product page

There are two ways a Judge.me Review Widget can appear on a product page.
**Only one should be in use at a time.**

1. **The theme's own "Judge.me reviews" section** (default, always in the
   product template). File: `sections/pp-judgeme-product-reviews.liquid`,
   placed in `templates/product.json` as the `judgeme_reviews` section.
2. **Judge.me's own "Review Widget" app block.** It is added in the theme
   editor, either by Judge.me's **Install** button (Judge.me → Settings →
   Widgets → Review Widget) or by hand (Add section → Apps → Review Widget).
   It can land inside the main product section or in a section of its own.

If both are present, the theme removes its own section and keeps Judge.me's
block (see "Duplicate guard" below), so the page still shows one widget.

## Files involved

| File | What it does |
|---|---|
| `sections/pp-judgeme-product-reviews.liquid` | The theme's review section. Contains Judge.me's official Liquid code for the Review Widget, plus the duplicate guard script. |
| `assets/pp-judgeme.css` | Brand styling for Judge.me widgets (orange stars and buttons). Loaded by the reviews section and the product section. |
| `sections/product-information.liquid` | Main product section. The rating row under the title (`a#reviews-link`, "No reviews yet · Write a review" or the star rating) links to `#reviews`. It also shows any app blocks added to this section (`.pp-app-blocks`), so Judge.me's Install button can place its block here. |
| `assets/pp-product.js` | Scrolls to `#reviews` when the rating row is clicked, leaving room for the fixed header. |
| `snippets/pp-home-rating.liquid` | Star ratings on product cards, read from the `reviews.rating` / `judgeme.badge` product metafields. |
| `assets/pp-cart-drawer.css` | Styles Judge.me's "Customers rate this store" box in the cart drawer, and hides it if Judge.me puts it outside the drawer panel. |
| `config/settings_data.json` | Holds the Judge.me **app embed** (`judgeme_core`) and the cart drawer widget (`cart_drawer_widget`). Both must stay enabled. |
| `snippets/pp-judgeme-reviews.liquid` | **Unused** leftover from the original theme (not rendered anywhere). It would print a second widget with the same id, so do not render it. |

## Line-by-line check of `sections/pp-judgeme-product-reviews.liquid`

Checked against Judge.me's help article "Liquid code for Judge.me widgets"
(article dated 16 January 2026,
https://judge.me/help/en/articles/12058208-liquid-code-for-judge-me-widgets).

| Lines | Code | Matches Judge.me? |
|---|---|---|
| 1 | Loads `pp-judgeme.css` | Theme only (styling). |
| 10–11 | `<section class="pp-creviews" id="reviews">` wrapper | Theme only. `id="reviews"` is the target of the star link. |
| 12–16 | `has_legacy` set when `product.metafields.judgeme.widget.size > 20` | Same as Judge.me. |
| 17 | `<div style="clear:both"></div>` | Same. |
| 18–29 | `div#judgeme_product_reviews.jdgm-widget.jdgm-review-widget` with `data-product-title`, `data-id`, `data-product-id`, `data-widget="review"`, `data-auto-install="false"`, `data-shop-reviews-count`, `data-entry-point="review_widget.js"`, `data-entry-key="review-widget/main.js"` | Same attributes and values (double quotes instead of single; no difference). |
| 30–32 | Hidden `.jdgm-legacy-widget-content` with `product.metafields.judgeme.widget` when `has_legacy` | Same. |
| 34–37 | When `product.metafields.judgeme.review_widget_data` exists, a script sets `jdgm.data.reviewWidget[product.id]` | Same, plus `window.jdgm = window.jdgm \|\| {};` first, because this section renders before Judge.me's scripts create `window.jdgm`. Without it the line would throw an error. |
| After the section | Duplicate guard script | Theme only (see below). |

Conclusion: the theme's widget code is Judge.me's official code. It does not
create a second review section by itself.

## Duplicate guard

At the end of `sections/pp-judgeme-product-reviews.liquid`. Rules:

- It looks for a Judge.me review widget inside a Shopify app block
  (`.shopify-app-block .jdgm-review-widget`) anywhere on the page that is not
  the theme's own widget.
- If it finds one, it removes the theme's section (`section.pp-creviews`) and
  puts an empty `<div id="reviews">` marker just before Judge.me's block, so
  the star link still scrolls to the reviews.
- It runs immediately (for a block above the theme's section) and again when
  the page has been parsed (for a block below it), before Judge.me's scripts
  fill the widgets.
- With no Judge.me block on the page, it does nothing.

Tested on 9 November 2026 against the live product page: block above, block
below, and no block all leave exactly one widget.

## Known issues and what causes them

### Two review sections on one product page

- **Seen:** 9 November 2026 on
  `/products/round-marble-side-table-two-tier-metal-frame` (live theme
  "prettyandpractical-theme-11-09-2026").
- **Cause:** a Judge.me Review Widget app block had been added to the live
  theme's product template as its own section (a Horizon "Custom section",
  section id ending `1794233396f7845d29`) while the theme's own
  "Judge.me reviews" section was still there. The live theme predates the
  duplicate guard, so both showed. It was removed from the live theme
  shortly after.
- **Fix:** the duplicate guard above (any position). Until the live theme is
  updated from `main`, remove one of the two in the theme editor
  (Products → Default product).

### "review_widget" not added. There is a problem with the app block.

- Shown by the theme editor when Judge.me's **Install** button cannot add its
  block. Judge.me's help says it is safe to ignore and to add the block by
  hand instead (https://judge.me/help/en/articles/11424925-adding-the-review-widget-on-your-product-page).
- Likely cause in this theme: the main product section accepted app blocks
  but never showed them. Fixed in commit e3d47fb (`.pp-app-blocks` in
  `sections/product-information.liquid`).
- You do not need the app block: the theme's own section already shows the
  widget.

### Some products show the old widget with no "Write a review" button

- **Seen:** 9 November 2026. `bamboo-plant-stand-2-tier-tall-flower-shelf`
  shows Judge.me's legacy widget with the button hidden;
  `tilting-tv-wall-mount-bracket-32-to-85-inch-60-kg` shows the new widget
  with its button.
- **Cause:** the new widget only loads when Judge.me has written the
  `judgeme.review_widget_data` metafield for that product. Products without it
  fall back to the legacy `judgeme.widget` content, whose button stays hidden.
  This is Judge.me data, not theme code. Judge.me's setting
  `write_review_button_visibility` is `everyone`.
- **Fix:** Judge.me must write `review_widget_data` for every product (ask
  Judge.me support to re-sync), then every product gets the new widget.

### Reviews do not show (0 reviews)

- **Seen:** November 2026 after the app was reinstalled. The live widget
  reports `data-shop-reviews-count="0"` and `data-number-of-reviews="0"`.
- **Cause:** the live store's Judge.me account has no published reviews
  synced to Shopify. The test store works because its Judge.me account has
  reviews and metafields.
- **Fix (in Judge.me, not the theme):** open Judge.me from the **live**
  store's admin, check the reviews are there and published, re-import the CSV
  if needed, or ask Judge.me support to re-sync reviews to Shopify.

## Quick diagnosis on a live product page

Open the product page, then run in the browser console:

```js
const w = document.querySelectorAll('.jdgm-review-widget');
const pid = ShopifyAnalytics.meta.product.id;
({
  widgets: w.length,                                   // should be 1
  inAppBlock: [...w].map(x => !!x.closest('.shopify-app-block')),
  newWidgetData: !!(window.jdgm?.data?.reviewWidget?.[pid]),
  shopReviews: w[0]?.dataset.shopReviewsCount,
  revamp: jdgmSettings.review_widget_revamp_enabled,
  writeButton: jdgmSettings.write_review_button_visibility,
});
```

## Official references

- Liquid code for Judge.me widgets (dated 16 January 2026):
  https://judge.me/help/en/articles/12058208-liquid-code-for-judge-me-widgets
- Adding the Review Widget on your product page (dated 19 August 2026):
  https://judge.me/help/en/articles/11424925-adding-the-review-widget-on-your-product-page
- Shopify: configure theme app extensions (app blocks and deep links):
  https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration

## Change log

- 9 November 2026: duplicate guard now catches Judge.me's block anywhere on
  the page (own section, above or below), not only inside the product
  section. Document created.
- 9 November 2026 (e3d47fb): product section shows app blocks; first
  duplicate guard for a Judge.me block inside the product section.
