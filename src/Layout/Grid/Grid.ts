import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators';

@customElement('juel-grid')
export class JuelGrid extends LitElement {
  @property({ type: String }) layout: string = '';
  @property({ type: String }) gap: string | null = null;
  @property({ type: String, attribute: "column-gap" }) columnGap: string | null = null;
  @property({ type: String, attribute: "row-gap" }) rowGap: string | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .grid {
      display: grid;
      width: 100%;
      height: 100%;
    }
  `;

  private generateGridStyles() {
    if (!this.layout) return '';

    const rows = this.layout.trim().split(' ').map(Number);
    const maxColumns = Math.max(...rows);

    // Generate `grid-template-rows` and `grid-template-columns`
    const gridTemplateRows = rows.map(() => 'auto').join(' ');
    const gridTemplateColumns = `repeat(${maxColumns}, 1fr)`;

    // Generate `grid-template-areas`
    const gridTemplateAreas = rows
      .map((cols, rowIndex) => {
        const areas = Array.from({ length: cols }, (_, colIndex) => `cell-${rowIndex + 1}-${colIndex + 1}`);
        while (areas.length < maxColumns) {
          areas.push(areas[areas.length - 1]);
        }
        return `"${areas.join(' ')}"`;
      })
      .join(' ');

    // Add gap styles
    const gapStyles = `
      ${this.gap ? `gap: ${this.gap};` : ''}
      ${this.columnGap ? `column-gap: ${this.columnGap};` : ''}
      ${this.rowGap ? `row-gap: ${this.rowGap};` : ''}
    `;

    return `
      grid-template-rows: ${gridTemplateRows};
      grid-template-columns: ${gridTemplateColumns};
      grid-template-areas: ${gridTemplateAreas};
      ${gapStyles}
    `;
  }

  private generateSlottedStyles() {
    if (!this.layout) return '';

    const rows = this.layout.trim().split(' ').map(Number);
    let slottedStyles = '';
    let areaIndex = 1;

    rows.forEach((cols, rowIndex) => {
      for (let colIndex = 0; colIndex < cols; colIndex++) {
        slottedStyles += `
          ::slotted(:nth-child(${areaIndex})) {
            grid-area: cell-${rowIndex + 1}-${colIndex + 1};
          }
        `;
        areaIndex++;
      }
    });

    return slottedStyles;
  }

  render() {
    const gridStyles = this.generateGridStyles();
    const slottedStyles = this.generateSlottedStyles();

    return html`
      <style>
        .grid {
          ${gridStyles}
        }
        ${slottedStyles}
      </style>
      <div class="grid">
        <slot></slot>
      </div>
    `;
  }
}