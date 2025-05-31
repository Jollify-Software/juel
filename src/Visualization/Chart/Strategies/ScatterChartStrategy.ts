import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class ScatterChartStrategy extends ChartStrategy {
  render(): void {
    // Each series.data is an array of [x, y] pairs
    const allPoints = this.series.flatMap(s => s.data as [number, number][]);
    const xExtent = d3.extent(allPoints, d => d[0]) as [number, number];
    const yExtent = d3.extent(allPoints, d => d[1]) as [number, number];

    const x = d3.scaleLinear().domain(xExtent).nice().range([this.margin.left, this.width - this.margin.right]);
    const y = d3.scaleLinear().domain(yExtent).nice().range([this.height - this.margin.bottom, this.margin.top]);

    const xAxis = (g: any) =>
      g.attr('transform', `translate(0,${this.height - this.margin.bottom})`).call(d3.axisBottom(x));
    const yAxis = (g: any) => g.attr('transform', `translate(${this.margin.left},0)`).call(d3.axisLeft(y));

    this.svg.append('g').call(xAxis);
    this.svg.append('g').call(yAxis);

    this.series.forEach((s, seriesIdx) => {
      this.svg
        .selectAll(`.scatter-point-series-${seriesIdx}`)
        .data(s.data as [number, number][])
        .enter()
        .append('circle')
        .attr('class', `scatter-point-series-${seriesIdx}`)
        .attr('cx', d => x(d[0]))
        .attr('cy', d => y(d[1]))
        .attr('r', 6)
        .attr('fill', s.color)
        .attr('data-value', d => d[1])
        .attr('data-series', s.label)
        .attr('data-label', d => d[0])
        .call(circles => this.attachTooltip(circles as any));
    });

    this.renderLegends();
  }
}