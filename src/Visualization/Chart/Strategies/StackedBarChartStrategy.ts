import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class StackedBarChartStrategy extends ChartStrategy {
  render(): void {
    const categoryIndices = this.labels ?? this.series[0]?.data.map((_, i) => i.toString()) ?? [];
    const x = d3.scaleBand().domain(categoryIndices).range([this.margin.left, this.width - this.margin.right]).padding(0.1);
    const y = d3.scaleLinear()
      .domain([0, d3.max(categoryIndices, (d, i) => d3.sum(this.series, s => s.data[i])) ?? 0])
      .nice()
      .range([this.height - this.margin.bottom, this.margin.top]);

    const xAxis = (g: any) =>
      g.attr('transform', `translate(0,${this.height - this.margin.bottom})`).call(d3.axisBottom(x));
    const yAxis = (g: any) => g.attr('transform', `translate(${this.margin.left},0)`).call(d3.axisLeft(y));

    this.svg.append('g').call(xAxis);
    this.svg.append('g').call(yAxis);

    let yStack = Array(categoryIndices.length).fill(0);

    this.series.forEach((s, seriesIdx) => {
      this.svg
        .selectAll(`.stacked-bar-series-${seriesIdx}`)
        .data(s.data)
        .enter()
        .append('rect')
        .attr('class', `stacked-bar-series-${seriesIdx}`)
        .attr('x', (_, i) => x(categoryIndices[i])!)
        .attr('y', (d, i) => y(yStack[i] + d))
        .attr('height', (d, i) => y(yStack[i]) - y(yStack[i] + d))
        .attr('width', x.bandwidth())
        .attr('fill', s.color)
        .attr('data-value', d => d)
        .attr('data-series', s.label)
        .attr('data-label', (_, i) => this.labels?.[i] ?? categoryIndices[i])
        .call(rects => this.attachTooltip(rects as any));

      yStack = yStack.map((v, i) => v + s.data[i]);
    });

    this.renderLegends();
  }
}