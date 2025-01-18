import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement("juel-parallax")
export class ParallaxSection extends LitElement {
  // Define properties
  @property({ type: String }) image = '';
  @property({ type: Number }) height = 500;
  @property({ type: Number }) intensity = 0.5;

  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      overflow: hidden;
    }
    .parallax-container {
      position: relative;
      height: var(--section-height, 500px);
      overflow: hidden;
    }
    .parallax-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: calc(var(--section-height, 500px) * 2);
      background-size: cover;
      background-position: center;
      will-change: transform;
    }
    .content {
      position: relative;
      z-index: 1;
      text-align: center;
      padding: 50px;
      background: #f4f4f4;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('scroll', this.handleScroll);
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.handleScroll);
    super.disconnectedCallback();
  }

  private handleScroll = () => {
    const image = this.shadowRoot!.querySelector('.parallax-image') as HTMLElement;
    const offset = window.scrollY * this.intensity;
    if (image) {
      image.style.transform = `translateY(${offset}px)`;
    }
  };

  render() {
    return html`
      <div
        class="parallax-container"
        style="--section-height: ${this.height}px;"
      >
        <div
          class="parallax-image"
          style="background-image: url(${this.image});"
        ></div>
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}