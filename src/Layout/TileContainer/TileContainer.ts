import { LitElement, html, CSSResultGroup, unsafeCSS } from 'lit';
import Hammer from 'hammerjs';
import Style from 'bundle-text:./TileContainer.less';
import { customElement, property } from 'lit/decorators';
import { TileItem } from './Tile';

@customElement("juel-tile-container")
export class JuelTileContainer extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Style);

    @property({ type: Array }) tiles: TileItem[] = [];

    render() {
        return html`
          ${this.tiles.map(
            (tile, index) => html`
              <div
                class="tile ${tile.size}"
                style="background-color: ${tile.backgroundColor || '#0078d7'}; 
                       background-image: url(${tile.imageUrl || ''});"
                @click=${() => this.handleTileClick(index)}
              >
                <div class="content">
                  <p class="title">${tile.title}</p>
                  ${tile.description
                    ? html`<p class="description">${tile.description}</p>`
                    : ''}
                </div>
              </div>
            `
          )}
        `;
      }
    
      firstUpdated() {
        this.tiles.forEach((tile, index) => {
          if (tile.draggable) {
            this.addDraggableBehavior(index);
          }
        });
      }
    
      private addDraggableBehavior(index: number) {
        const tileElement = this.shadowRoot!.querySelectorAll<HTMLElement>('.tile')[index];
        const hammerInstance = new Hammer(tileElement);
    
        hammerInstance.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL }));
    
        hammerInstance.on('pan', (event) => {
          tileElement.style.transform = `translate(${event.deltaX}px, ${event.deltaY}px)`;
        });
    
        hammerInstance.on('panend', () => {
          tileElement.style.transform = '';
        });
      }
    
      private handleTileClick(index: number) {
        const clickedTile = this.tiles[index];
        const event = new CustomEvent('tile-click', {
          detail: { tile: clickedTile, index },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(event);
      }
}