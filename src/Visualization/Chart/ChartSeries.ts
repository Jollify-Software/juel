import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ArrayConverter, MultiArrayConvertor } from '../../_Converters/ArrayConverter';

@customElement('juel-chart-series')
export class JuelChartSeries extends LitElement {
  @property({ type: Array, converter: MultiArrayConvertor(',', ':') })
  data: number[] | number[][] = [];
  @property({ type: String }) label: string = '';
  @property({ type: String }) color: string = 'steelblue';

  createRenderRoot() {
    // Prevent shadow DOM so parent can read child content
    return this;
  }

  render() {
    return html``; // This element only provides data, no rendering
  }
}
