import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class AreaChartStrategy extends ChartStrategy {
  render(): void {
    const categoryIndices = this.labels ?? this.series[0]?.data.map((_, i) => i.toString()) ?? [];
    const x = d3.scalePoint().domain(categoryIndices).range([this.margin.left, this.width - this.margin.right]);
    const maxY = d3.max(this.series.flatMap(s => s.data as number[])) ?? 0;
    const y = d3.scaleLinear().domain([0, maxY]).nice().range([this.height - this.margin.bottom, this.margin.top]);

    const xAxis = (g: any) =>
      g.attr('transform', `translate(0,${this.height - this.margin.bottom})`).call(d3.axisBottom(x));
    const yAxis = (g: any) => g.attr('transform', `translate(${this.margin.left},0)`).call(d3.axisLeft(y));

    this.svg.append('g').call(xAxis);
    this.svg.append('g').call(yAxis);

    this.series.forEach((s, seriesIdx) => {
      const area = d3.area<number>()
        .x((_, i) => x(categoryIndices[i])!)
        .y0(y(0))
        .y1(d => y(d));

      this.svg
        .append('path')
        .datum(s.data)
        .attr('fill', s.color)
        .attr('opacity', 0.5)
        .attr('stroke', s.color)
        .attr('stroke-width', 2)
        .attr('d', area)
        .attr('data-series', s.label)
        .call(path => this.attachTooltip(path as any));
    });

    this.renderLegends();
  }
}