import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Progress.less';

@customElement('juel-progress')
export class ProgressBar extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);
    
  // Progress value (0 to 100)
  @property({ type: Number }) value: number = 0;
  // Whether to track scroll progress automatically
  @property({ type: Boolean }) trackScroll: boolean = false;

  private scrollListener!: () => void;

  connectedCallback() {
    super.connectedCallback();
    if (this.trackScroll) {
      this.initializeScrollTracking();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.trackScroll) {
      this.teardownScrollTracking();
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('trackScroll')) {
      if (this.trackScroll) {
        this.initializeScrollTracking();
      } else {
        this.teardownScrollTracking();
      }
    }
  }

  initializeScrollTracking() {
    this.scrollListener = this.updateScrollProgress.bind(this);
    window.addEventListener('scroll', this.scrollListener);
    this.updateScrollProgress();
  }

  teardownScrollTracking() {
    window.removeEventListener('scroll', this.scrollListener);
  }

  updateScrollProgress() {
    const scrollTop = document.body.scrollTop;
    const scrollHeight = document.body.scrollHeight - document.body.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    this.value = progress;
  }

  render() {
    return html`
      <div class="progress" style="width: ${this.value}%;"></div>
    `;
  }
}