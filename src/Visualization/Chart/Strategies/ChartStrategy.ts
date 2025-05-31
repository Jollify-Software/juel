import * as d3 from 'd3';
import { ChartSeries } from '../Classes/ChartSeries';

export abstract class ChartStrategy {
  constructor(
    protected svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>,
    protected width: number,
    protected height: number,
    protected margin: { top: number; right: number; bottom: number; left: number },
    protected series: ChartSeries[],
    protected labels?: string[]
  ) {}

  abstract render(): void;

  protected renderLegends(): void {
    const legendGroup = this.svg.append('g').attr('class', 'legend');
    const legendSpacing = 20;
    const legendPadding = 10;
    const labelWidths: number[] = [];

    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(tempSvg);

    const tempText = d3
      .select(tempSvg)
      .selectAll('text')
      .data(this.series)
      .enter()
      .append('text')
      .text(d => d.label)
      .each(function (_, i) {
        labelWidths[i] = this.getComputedTextLength();
      });

    tempSvg.remove();

    const totalWidth = this.series.reduce((sum, s, i) => sum + 24 + labelWidths[i] + legendPadding, 0);
    let xOffset = (this.width - totalWidth) / 2;

    const legendEntry = legendGroup
      .selectAll('g')
      .data(this.series)
      .join('g')
      .attr('transform', (_, i) => {
        const x = xOffset;
        xOffset += 24 + labelWidths[i] + legendPadding;
        return `translate(${x}, ${this.height - 10})`;
      });

    legendEntry.append('circle').attr('r', 6).attr('cy', -6).attr('fill', d => d.color);

    legendEntry
      .append('text')
      .text(d => d.label)
      .attr('x', 12)
      .attr('y', -2)
      .style('font-size', '12px')
      .attr('alignment-baseline', 'middle');
  }

  protected tooltipDiv?: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

  protected ensureTooltip() {
    if (!this.tooltipDiv) {
      this.tooltipDiv = d3
        .select('body')
        .append('div')
        .attr('class', 'juel-chart-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', '#fff')
        .style('padding', '6px 10px')
        .style('border-radius', '4px')
        .style('font-size', '13px')
        .style('z-index', '1000')
        .style('display', 'none');
    }
  }

  protected attachTooltip(selection: d3.Selection<SVGElement, any, any, any>) {
    this.ensureTooltip();
    selection
      .on('mouseover', (event, d) => {
        const target = event.currentTarget as SVGElement;
        const value = target.getAttribute('data-value');
        const series = target.getAttribute('data-series');
        const label = target.getAttribute('data-label') ?? "Value";
        this.tooltipDiv!
          .style('display', 'block')
          .html(`<strong>${series}</strong><br/>${label}: ${value}`);
      })
      .on('mousemove', (event) => {
        this.tooltipDiv!
          .style('left', event.pageX + 12 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseleave', () => {
        this.tooltipDiv!.style('display', 'none');
      });
  }
  
}