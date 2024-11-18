import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Lightbox.less';
import { ArrayConverter } from "../../_Converters/ArrayConverter";
import { JuelComponent } from "../../_Base/JuelComponent";

@customElement('juel-lightbox')
export class JuelLightbox extends JuelComponent {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  @property() selector: string;
  @property({ type: Array, converter: ArrayConverter() })
  selectors: string[] = [];

  // Index of the currently displayed image
  @property({ type: Number })
  currentIndex: number = 0;

  // Whether the lightbox is open
  @property({ type: Boolean })
  isOpen: boolean = false;

    images: string[] = [];

    firstLoad(): void {
        let i = 0;
        console.log(this.selector)
        if (this.selector) {
            let elements = document.querySelectorAll(this.selector) as NodeListOf<HTMLImageElement>;
            console.log(elements.length)
            if (elements) {
                console.log("Found")
                for (let ele of Array.from(elements)) {
                    let src = ele.src;
                    console.log(src)
                    this.images.push(src);
                    let index = i;
                    ele.addEventListener("click", () => this.openLightbox(index));
                    i++  
                }
            }
        } else if (this.selectors) {
        for (let selector of this.selectors) {
            let ele = document.querySelector(selector) as HTMLImageElement;
            if (ele) {
                let src = ele.src;
                this.images.push(src);
                let index = i;
                ele.addEventListener("click", () => this.openLightbox(index));
            }
            i++
        }
    }   
    }

  // Method to open the lightbox
  openLightbox(index: number) {
    this.currentIndex = index;
    this.isOpen = true;
  }

  // Method to close the lightbox
  closeLightbox() {
    this.isOpen = false;
  }

  // Navigate to the previous image
  prevImage() {
    if (this.images.length > 0) {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    }
  }

  // Navigate to the next image
  nextImage() {
    if (this.images.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }
  }

  // Render the lightbox
  render() {
    return html`
      <div class="overlay ${this.isOpen ? 'open' : ''}">
        <div class="lightbox-content">
          <button class="close-btn" @click="${this.closeLightbox}">×</button>
          ${this.images.length > 0
            ? html`<img src="${this.images[this.currentIndex]}" alt="Lightbox Image" />`
            : html`<p>No images available</p>`}
          <div class="controls">
            <button @click="${this.prevImage}" ?disabled="${this.images.length <= 1}">Previous</button>
            <button @click="${this.nextImage}" ?disabled="${this.images.length <= 1}">Next</button>
          </div>
        </div>
      </div>
    `;
  }
  
}