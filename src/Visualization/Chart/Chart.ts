import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import * as d3 from 'd3';
import { debounceTime, Subject } from 'rxjs';
import { ArrayConverter } from '../../_Converters/ArrayConverter';
import { ChartType } from './Classes/ChartType';
import { ChartSeries } from './Classes/ChartSeries';
import { ChartStrategy } from './Strategies/ChartStrategy';
import { PieChartStrategy } from './Strategies/PieChartStrategy';
import { LineChartStrategy } from './Strategies/LineChartStrategy';
import { BarChartStrategy } from './Strategies/BarChartStrategy';
import { AreaChartStrategy } from './Strategies/AreaChartStrategy';
import { DoughnutChartStrategy } from './Strategies/DoughnutChartStrategy';
import { StackedBarChartStrategy } from './Strategies/StackedBarChartStrategy';
import { ScatterChartStrategy } from './Strategies/ScatterChartStrategy';
import { RadarChartStrategy } from './Strategies/RadarChartStrategy';
import { GaugeChartStrategy } from './Strategies/GaugeChartStrategy';

function AllChartStrategies(): { [key: string]: typeof ChartStrategy } {
  let obj: { [key: string]: typeof ChartStrategy } = {};
  obj[ChartType.Bar] = BarChartStrategy;
  obj[ChartType.Line] = LineChartStrategy;
  obj[ChartType.Area] = AreaChartStrategy;
  obj[ChartType.Doughnut] = DoughnutChartStrategy;
  obj[ChartType.Pie] = PieChartStrategy;
  obj[ChartType.StackedBar] = StackedBarChartStrategy;
  obj[ChartType.Scatter] = ScatterChartStrategy;
  obj[ChartType.Radar] = RadarChartStrategy;
  obj[ChartType.Gauge] = GaugeChartStrategy;
  return obj;
};

@customElement('juel-chart')
export class JuelChart extends LitElement {
  @property({ type: String }) type: ChartType = ChartType.Bar;
  @property({ type: Array, converter: ArrayConverter(',') }) labels?: string[];

  @query('slot') slotElement!: HTMLSlotElement;

  private slotChange$ = new Subject<void>();
  private mutationObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;
  private tooltipDiv?: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

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
      .juel-chart-tooltip {
  transition: opacity 0.15s;
  pointer-events: none;
}
  `;

  constructor() {
    super();
    this.slotChange$.pipe(debounceTime(50)).subscribe(() => this.renderChart());
  }

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => this.slotChange$.next());
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.tooltipDiv?.remove();
    this.tooltipDiv = undefined;
  }

  render() {
    return html`
      <svg></svg>
      <slot @slotchange=${this.handleSlotchange}></slot>
    `;
  }

  private handleSlotchange() {
    this.observeSeriesMutations();
    this.slotChange$.next();
  }

  private observeSeriesMutations() {
    this.mutationObserver?.disconnect();

    this.mutationObserver = new MutationObserver(() => {
      this.slotChange$.next();
    });

    this.seriesElements.forEach(el => {
      this.mutationObserver!.observe(el, { attributes: true });
    });
  }

  private get seriesElements(): HTMLElement[] {
    return (this.slotElement.assignedElements() || []) as HTMLElement[];
  }

  private renderChart() {
    const svg = d3.select(this.renderRoot.querySelector('svg'));
    svg.selectAll('*').remove();

    const width = this.clientWidth;
    const height = this.clientHeight;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    // Not laid out yet (detached, display:none, or being measured by a
    // paginator): drawing now gives negative bar heights. The ResizeObserver
    // draws again once the chart has a size.
    if (width <= margin.left + margin.right || height <= margin.top + margin.bottom) return;

    const allSeries: ChartSeries[] = this.seriesElements.map(el => {
      let s: ChartSeries = {
        label: (el as any).label,
        data: (el as any).data as number[],
        color: (el as any).color || 'steelblue'
      };
      if ((el as any).min !== undefined) {
        s.min = Number((el as any).min);
      }
      if ((el as any).max !== undefined) {
        s.max = Number((el as any).max);
      }
      return s;
    });

    if (!this.tooltipDiv) {
      this.tooltipDiv = ChartStrategy.createTooltip();
    }

    const StrategyClass: any = AllChartStrategies()[this.type] || BarChartStrategy;
    const strategy = new StrategyClass(svg, width, height, margin, allSeries, this.labels, this.tooltipDiv);

    strategy.render();
  }
}