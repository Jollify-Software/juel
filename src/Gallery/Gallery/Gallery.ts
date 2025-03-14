import { LitElement, html, css } from 'lit';
import { customElement, queryAssignedElements } from 'lit/decorators.js';

@customElement('juel-gallery')
export class GalleryComponent extends LitElement {
  @queryAssignedElements({ selector: 'img' }) images!: NodeListOf<HTMLImageElement>;
  private selectedIndex: number | null = null;

  static styles = css`
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
    }
    .image-container {
      position: relative;
      overflow: hidden;
    }
    ::slotted(img) {
      width: 100%;
      cursor: pointer;
      border-radius: 5px;
      transition: transform 0.3s;
    }
    ::slotted(img:hover) {
      transform: scale(1.05);
    }
    .caption {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      text-align: center;
      padding: 5px;
      font-size: 14px;
      transform: translateY(100%);
      transition: transform 0.3s;
    }
    .image-container:hover .caption {
      transform: translateY(0);
    }
    .lightbox {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .lightbox img {
      max-width: 90%;
      max-height: 80%;
      border-radius: 5px;
    }
    .lightbox .caption {
      position: relative;
      background: none;
      font-size: 1.2rem;
      padding: 10px;
    }
    .lightbox .close, .lightbox .prev, .lightbox .next {
      position: absolute;
      color: white;
      font-size: 2rem;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.5);
      padding: 10px;
      border-radius: 5px;
    }
    .close { top: 10px; right: 20px; }
    .prev { left: 20px; }
    .next { right: 20px; }
  `;

  firstUpdated() {
    this.addClickListeners();
  }

  addClickListeners() {
    this.images.forEach((img, index) => {
      img.addEventListener('click', () => this.openLightbox(index));
    });
  }

  openLightbox(index: number) {
    this.selectedIndex = index;
    this.requestUpdate();
  }

  closeLightbox() {
    this.selectedIndex = null;
    this.requestUpdate();
  }

  nextImage(event: Event) {
    event.stopPropagation();
    if (this.selectedIndex !== null && this.images.length > 0) {
      this.selectedIndex = (this.selectedIndex + 1) % this.images.length;
      this.requestUpdate();
    }
  }

  prevImage(event: Event) {
    event.stopPropagation();
    if (this.selectedIndex !== null && this.images.length > 0) {
      this.selectedIndex = (this.selectedIndex - 1 + this.images.length) % this.images.length;
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <div class="gallery">
        <slot @slotchange="${() => { this.requestUpdate(); this.addClickListeners(); }}"></slot>
      </div>
      
      ${this.selectedIndex !== null ? html`
        <div class="lightbox" @click="${this.closeLightbox}">
          <span class="close" @click="${(e: Event) => { e.stopPropagation(); this.closeLightbox(); }}">&times;</span>
          <span class="prev" @click="${this.prevImage}">&#10094;</span>
          <img src="${this.images[this.selectedIndex].src}" alt="${this.images[this.selectedIndex].alt}">
          <div class="caption">${this.images[this.selectedIndex].alt}</div>
          <span class="next" @click="${this.nextImage}">&#10095;</span>
        </div>
      ` : ''}
    `;
  }
}