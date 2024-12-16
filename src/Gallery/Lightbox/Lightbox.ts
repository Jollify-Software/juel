import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Lightbox.less';
import { ArrayConverter } from "../../_Converters/ArrayConverter";
import { JuelComponent } from "../../_Base/JuelComponent";
import { isMediaSource } from "../../_Utils/String/isMediaSource";
import { IconsModule } from "../../_Modules/IconsModule";
import { LightboxItem } from "./LightboxItem";
import { lightboxItemTemplate } from "./Templates/LightboxItemTemplate";

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

    items: LightboxItem[] = [];

    firstLoad(): void {
        let i = 0;
        console.log(this.selector)
        if (this.selector) {
            let elements = document.querySelectorAll(this.selector) as NodeListOf<HTMLImageElement>;
            console.log(elements.length)
            if (elements) {
                console.log("Found")
                for (let ele of Array.from(elements)) {
                    let index = i;
                    this.processElement(ele, index);
                    i++  
                }
            }
        } else if (this.selectors) {
        for (let selector of this.selectors) {
            let ele = document.querySelector(selector) as HTMLImageElement;
            if (ele) {
                let index = i;
                this.processElement(ele, index);
            }
            i++
        }
    }   
    }

    processElement(element: HTMLImageElement, index: number) {
      let src = element.dataset.src ?? element.src;
      console.log(src)
      let type = isMediaSource(src);
      let item: LightboxItem = {
        src: src,
        type: type.type,
        platform: type.platform
      };
      this.items.push(item);
      // If src is video
      if (type.type == "video" || type.type == "audio") {
        let playBtn = $('<div class="play-btn" />')
        let svg = IconsModule.get("play");
        playBtn.append(svg);
        $(element).wrap($('<div class="play-container" />'))
          .after(playBtn);
          playBtn.on("click", () => this.openLightbox(index));
      } else {
        element.addEventListener("click", () => this.openLightbox(index));
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
    if (this.items.length > 0) {
      this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    }
  }

  // Navigate to the next image
  nextImage() {
    if (this.items.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
    }
  }

  // Render the lightbox
  render() {
    return html`
      <div class="overlay ${this.isOpen ? 'open' : ''}">
        <div class="lightbox-content">
          <div class="close-btn" @click="${this.closeLightbox}"></div>
          ${this.items.length > 0 && this.isOpen
            ? lightboxItemTemplate(this.items[this.currentIndex])
            : html`<p>No images available</p>`}
          <div class="controls">
            <button @click="${this.prevImage}" ?disabled="${this.items.length <= 1}">Previous</button>
            <button @click="${this.nextImage}" ?disabled="${this.items.length <= 1}">Next</button>
          </div>
        </div>
      </div>
    `;
  }
  
}