import { Component } from '@theme/component';
import { debounce, isClickedOutside, onAnimationEnd } from '@theme/utilities';

/**
 * A custom element that manages a dialog.
 *
 * @typedef {object} Refs
 * @property {HTMLDialogElement} dialog – The dialog element.
 *
 * @extends Component<Refs>
 */
export class DialogComponent extends Component {
  requiredRefs = ['dialog'];
  #previousScrollY = 0;
  #scrollLockState = null;

  connectedCallback() {
    super.connectedCallback();

    if (this.minWidth || this.maxWidth) {
      window.addEventListener('resize', this.#handleResize);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.minWidth || this.maxWidth) {
      window.removeEventListener('resize', this.#handleResize);
    }
  }

  #handleResize = debounce(() => {
    const { minWidth, maxWidth } = this;

    if (!minWidth && !maxWidth) return;

    const windowWidth = window.innerWidth;
    if (windowWidth < minWidth || windowWidth > maxWidth) {
      this.closeDialog();
    }
  }, 50);

  /**
   * Shows the dialog.
   */
  showDialog() {
    const { dialog } = this.refs;

    if (dialog.open) return;

    const scrollY = window.scrollY;
    this.#previousScrollY = scrollY;

    // Prevent layout thrashing by separating DOM reads from DOM writes
    requestAnimationFrame(() => {
      this.#lockScroll(scrollY);

      dialog.showModal();
      this.dispatchEvent(new DialogOpenEvent());

      this.addEventListener('click', this.#handleClick);
      this.addEventListener('keydown', this.#handleKeyDown);
    });
  }

  /**
   * Closes the dialog.
   */
  closeDialog = async () => {
    const { dialog } = this.refs;

    if (!dialog.open) return;

    this.removeEventListener('click', this.#handleClick);
    this.removeEventListener('keydown', this.#handleKeyDown);

    // Force browser to restart animation by resetting it
    // Temporarily remove any existing animation state
    dialog.style.animation = 'none';

    // Force a reflow
    void dialog.offsetWidth;

    // Now add the closing class and restore animation
    dialog.classList.add('dialog-closing');
    dialog.style.animation = '';

    await Promise.race([
      onAnimationEnd(dialog, undefined, {
        subtree: false,
      }),
      new Promise((resolve) => window.setTimeout(resolve, 360)),
    ]);

    this.#unlockScroll();

    dialog.close();
    dialog.classList.remove('dialog-closing');

    this.dispatchEvent(new DialogCloseEvent());
  };

  /**
   * Toggles the dialog.
   */
  toggleDialog = () => {
    if (this.refs.dialog.open) {
      this.closeDialog();
    } else {
      this.showDialog();
    }
  };

  /**
   * Closes the dialog when the user clicks outside of it.
   *
   * @param {MouseEvent} event - The mouse event.
   */
  #handleClick(event) {
    const { dialog } = this.refs;

    if (isClickedOutside(event, dialog)) {
      this.closeDialog();
    }
  }

  /**
   * Closes the dialog when the user presses the escape key.
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #handleKeyDown(event) {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    this.closeDialog();
  }

  /**
   * Gets the minimum width of the dialog.
   *
   * @returns {number} The minimum width of the dialog.
   */
  get minWidth() {
    return Number(this.getAttribute('dialog-active-min-width'));
  }

  /**
   * Gets the maximum width of the dialog.
   *
   * @returns {number} The maximum width of the dialog.
   */
  get maxWidth() {
    return Number(this.getAttribute('dialog-active-max-width'));
  }

  get scrollLockStrategy() {
    return this.refs.dialog?.getAttribute('data-scroll-lock-strategy') || 'fixed-body';
  }

  get scrollLockBodyClass() {
    return this.refs.dialog?.getAttribute('data-scroll-lock-body-class') || '';
  }

  get scrollLockHeaderSelector() {
    return this.refs.dialog?.getAttribute('data-scroll-lock-header-selector') || '';
  }

  #lockScroll(scrollY) {
    if (this.scrollLockStrategy === 'overlay') {
      const bodyClass = this.scrollLockBodyClass;
      const header =
        this.scrollLockHeaderSelector != ''
          ? document.querySelector(this.scrollLockHeaderSelector)
          : null;
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

      this.#scrollLockState = {
        headerPaddingRight: header instanceof HTMLElement ? header.style.paddingRight : null,
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body.style.overflow,
        bodyPaddingRight: document.body.style.paddingRight,
        bodyClassWasPresent: bodyClass != '' ? document.body.classList.contains(bodyClass) : false,
      };

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      if (bodyClass != '') {
        document.body.classList.add(bodyClass);
      }

      if (scrollbarWidth > 0) {
        const compensation = `${scrollbarWidth}px`;
        document.body.style.paddingRight = compensation;
        if (header instanceof HTMLElement) {
          header.style.paddingRight = compensation;
        }
      }

      return;
    }

    this.#scrollLockState = null;
    document.body.style.width = '100%';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
  }

  #unlockScroll() {
    if (this.scrollLockStrategy === 'overlay') {
      const bodyClass = this.scrollLockBodyClass;
      const header =
        this.scrollLockHeaderSelector != ''
          ? document.querySelector(this.scrollLockHeaderSelector)
          : null;
      const state = this.#scrollLockState;

      if (state) {
        document.documentElement.style.overflow = state.htmlOverflow;
        document.body.style.overflow = state.bodyOverflow;
        document.body.style.paddingRight = state.bodyPaddingRight;

        if (header instanceof HTMLElement && state.headerPaddingRight !== null) {
          header.style.paddingRight = state.headerPaddingRight;
        }

        if (bodyClass != '' && !state.bodyClassWasPresent) {
          document.body.classList.remove(bodyClass);
        }
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        if (header instanceof HTMLElement) {
          header.style.paddingRight = '';
        }
        if (bodyClass != '') {
          document.body.classList.remove(bodyClass);
        }
      }

      this.#scrollLockState = null;
      window.scrollTo({ top: this.#previousScrollY, behavior: 'instant' });
      return;
    }

    document.body.style.width = '';
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo({ top: this.#previousScrollY, behavior: 'instant' });
  }
}

if (!customElements.get('dialog-component')) customElements.define('dialog-component', DialogComponent);

export class DialogOpenEvent extends CustomEvent {
  constructor() {
    super(DialogOpenEvent.eventName);
  }

  static eventName = 'dialog:open';
}

export class DialogCloseEvent extends CustomEvent {
  constructor() {
    super(DialogCloseEvent.eventName);
  }

  static eventName = 'dialog:close';
}

document.addEventListener(
  'toggle',
  (event) => {
    if (event.target instanceof HTMLDetailsElement) {
      if (event.target.hasAttribute('scroll-lock')) {
        const { open } = event.target;
        if (open) {
          document.documentElement.setAttribute('scroll-lock', '');
        } else {
          document.documentElement.removeAttribute('scroll-lock');
        }
      }
    }
  },
  { capture: true }
);
