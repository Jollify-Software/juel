import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class BarChartStrategy extends ChartStrategy {
  render() {
    const categoryIndices = this.labels ?? this.series[0]?.data.map((_, i) => i.toString()) ?? [];

    const x0 = d3.scaleBand().domain(categoryIndices).range([this.margin.left, this.width - this.margin.right]).paddingInner(0.1);

    const x1 = d3
      .scaleBand()
      .domain(this.series.map(s => s.label))
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const maxY = d3.max(this.series.flatMap(s => s.data as number[])) ?? 0;

    const y = d3.scaleLinear().domain([0, maxY]).nice().range([this.height - this.margin.bottom, this.margin.top]);

    const xAxis = (g: any) =>
      g.attr('transform', `translate(0,${this.height - this.margin.bottom})`).call(d3.axisBottom(x0));

    const yAxis = (g: any) => g.attr('transform', `translate(${this.margin.left},0)`).call(d3.axisLeft(y));

    this.svg.append('g').call(xAxis);
    this.svg.append('g').call(yAxis);

    const categoryGroups = this.svg
      .append('g')
      .selectAll('g')
      .data(categoryIndices)
      .join('g')
      .attr('transform', d => `translate(${x0(d)},0)`);

    categoryGroups
      .selectAll('rect')
      .data((d, i) => this.series.map(s => ({
        label: s.label, xLabel: this.labels?.[i] ?? d,
        value: s.data[i], color: s.color
      })))
      .join('rect')
      .attr('x', d => x1(d.label)!)
      .attr('y', d => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', d => y(0) - y(d.value))
      .attr('fill', d => d.color)
      .attr('data-value', d => d.value)
      .attr('data-series', d => d.label)
      .attr('data-label', d => d.xLabel)
      .call(rects => this.attachTooltip(rects as any));

    this.renderLegends();
  }
}