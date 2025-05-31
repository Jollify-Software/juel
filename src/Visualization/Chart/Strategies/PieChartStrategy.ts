import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class PieChartStrategy extends ChartStrategy {
    render(): void {
    const radius = Math.min(this.width, this.height) / 2 - 40;
    const pieGroup = this.svg
      .append('g')
      .attr('transform', `translate(${this.width / 2},${this.height / 2 - 20})`);

    // Each series is a slice: use series[].data[0] as the value
    const pieData = this.series.map(s => ({
      label: s.label,
      value: s.data[0],
      color: s.color
    }));

    const pie = d3.pie<{ label: string; value: number; color: string }>()
      .value(d => d.value);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = pie(pieData);

    pieGroup
      .selectAll('path')
      .data(arcs)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('data-value', d => d.data.value)
      .attr('data-series', d => d.data.label)
      .attr('data-label', d => d.data.label)
      .call(paths => this.attachTooltip(paths as any));

    this.renderLegends();
  }
}