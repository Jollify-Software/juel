import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class LineChartStrategy extends ChartStrategy {
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

    const line = d3
      .line<number>()
      .x((_, i) => x(categoryIndices[i])!)
      .y(d => y(d));

    this.series.forEach((s, seriesIdx) => {
      this.svg
        .append('path')
        .datum(s.data)
        .attr('fill', 'none')
        .attr('stroke', s.color)
        .attr('stroke-width', 2)
        .attr('d', line);
          // Draw circles at each data point
      this.svg
        .selectAll(`.point-circle-series-${seriesIdx}`)
        .data(s.data)
        .enter()
        .append('circle')
        .attr('class', `point-circle-series-${seriesIdx}`)
        .attr('cx', (_, i) => x(categoryIndices[i])!)
        .attr('cy', d => y(d))
        .attr('r', 8)
        .attr('fill', s.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('data-value', d => d)
        .attr('data-series', s.label)
        .attr('data-label', (_, i) => this.labels?.[i] ?? categoryIndices[i])
        .call(circles => this.attachTooltip(circles as any));;
    });

    this.renderLegends();
  }
}