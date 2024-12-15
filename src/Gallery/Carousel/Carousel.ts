import { CSSResultGroup, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Carousel.less';
import { NavigationBase } from "../../_Base/NavigationBase";

@customElement("juel-carousel")
export class JuelCarousel extends NavigationBase {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property({ type: Boolean }) showControls = true;
    @property({ type: Number }) autoRotateInterval = 3000; // Interval in milliseconds

    private currentIndex = 0;
    private autoRotateTimer: number | null = null;
    private hammer: HammerManager | null = null;

    render() {
        return html`
          <div
            class="carousel"
            style="transform: translateX(-${this.currentIndex * 100}%);">
            <slot></slot>
          </div>
    
          ${this.showControls
                ? html`
                <div class="controls">
                  <button class="control prev" @click="${this.prev}">&#9664;</button>
                  <button class="control next" @click="${this.next}">&#9654;</button>
                </div>
              `
                : ''}
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.startAutoRotate();
        this.initializeHammer();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopAutoRotate();
        this.destroyHammer();
    }

    private initializeHammer() {
        this.hammer = new Hammer(this);
        this.hammer.on('swipeleft', () => this.next());
        this.hammer.on('swiperight', () => this.prev());
        this.hammer.on('panstart panend', () => this.pauseAutoRotate());
    }

    private destroyHammer() {
        this.hammer?.destroy();
        this.hammer = null;
    }

    private next() {
        this.pauseAutoRotate();
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.requestUpdate();
    }

    private prev() {
        this.pauseAutoRotate();
        this.currentIndex =
            (this.currentIndex - 1 + this.items.length) % this.items.length;
        this.requestUpdate();
    }

    private startAutoRotate() {
        this.autoRotateTimer = window.setInterval(() => {
            this.next();
        }, this.autoRotateInterval);
    }

    private pauseAutoRotate() {
        if (this.autoRotateTimer !== null) {
            window.clearInterval(this.autoRotateTimer);
            this.autoRotateTimer = null;
        }
    }

    private stopAutoRotate() {
        this.pauseAutoRotate();
    }
}      