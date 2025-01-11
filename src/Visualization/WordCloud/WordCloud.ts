import { LitElement, html, css } from 'lit';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { customElement, property } from 'lit/decorators';
import { ArrayConverter } from '../../_Converters/ArrayConverter';

@customElement('juel-word-cloud')
export class JuelWordCloud extends LitElement {
  // Styles for the component
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `;

  // Properties for the word cloud data and dimensions
  @property({ type: Array, converter: ArrayConverter(',') })
  words: string[] = [];

  @property({ type: Number })
  width: number = 500;

  @property({ type: Number })
  height: number = 500;

  firstUpdated() {
    this.renderWordCloud();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('words')) {
      this.renderWordCloud();
    }
  }

  renderWordCloud() {
    // Clear the existing SVG content
    const svgContainer = this.shadowRoot?.querySelector('svg');
    if (svgContainer) {
      svgContainer.innerHTML = '';
    }
console.log(this.words);
    const layout = cloud()
      .size([this.width, this.height])
      .words(this.words.map(function(d) {
        return {text: d, size: 10 + Math.random() * 90, test: "haha"};
      }))
      .padding(5)
      .font('sans-serif')
      .fontSize((d: any) => d.size)
      .rotate(() => (~~(Math.random() * 2) * 90)) // 0 or 90 degrees
      .on('end', (words: any[]) => this.draw(words));

    layout.start();
  }

  draw(words: any[]) {
    const svg = d3.select(this.shadowRoot)
      .select('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);

    g.selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', (d: any) => `${d.size}px`)
      .style('font-family', 'sans-serif')
      .style('fill', () => d3.schemeCategory10[Math.floor(Math.random() * 10)])
      .attr('text-anchor', 'middle')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`)
      .text((d: any) => d.text);
  }

  render() {
    return html`<svg></svg>`;
  }
}
