import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Scroll.less';

@customElement('juel-scroll')
export class JuelScroll extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  @property({ type: String }) triggerClass: string = 'animate'; // Class added to elements in view
  @property({ type: String }) animationClass: string = 'fade-in'; // Default animation class
  @property({ type: Number }) threshold: number = 0.2; // Percentage of the element visible to trigger
  @property({ type: Boolean }) once: boolean = true; // Trigger animations only once or repeatedly

  private observer!: IntersectionObserver;

  connectedCallback() {
    super.connectedCallback();
    this.initializeObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
  }

  initializeObserver() {
    const options = {
      root: null, // Use the viewport
      rootMargin: '0px',
      threshold: this.threshold, // Percentage of the element visible to trigger
    };

    this.observer = new IntersectionObserver(this.handleIntersect.bind(this), options);

    // Observe all elements with the trigger class
    const targets = this.querySelectorAll(`.${this.triggerClass}`);
    targets.forEach((el) => this.observer.observe(el));
  }

  handleIntersect(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
      const target = entry.target as HTMLElement;

      if (entry.isIntersecting) {
        target.classList.add(this.animationClass);

        if (this.once) {
          this.observer.unobserve(target); // Stop observing if once is true
        }
      } else if (!this.once) {
        target.classList.remove(this.animationClass);
      }
    });
  }

  render() {
    return html`<slot></slot>`;
  }
}