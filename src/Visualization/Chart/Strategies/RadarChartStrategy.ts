import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class RadarChartStrategy extends ChartStrategy {
  render(): void {
    const numAxes = this.labels?.length ?? this.series[0]?.data.length ?? 0;
    const radius = Math.min(this.width, this.height) / 2 - 40;
    const angleSlice = (2 * Math.PI) / numAxes;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const maxValue = d3.max(this.series.flatMap(s => s.data as number[])) ?? 1;

    // Draw axes
    for (let i = 0; i < numAxes; i++) {
      const angle = i * angleSlice - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      this.svg.append('line')
        .attr('x1', centerX)
        .attr('y1', centerY)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#ccc');
      // Axis label
      this.svg.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .text(this.labels?.[i] ?? `Axis ${i + 1}`)
        .style('font-size', '12px');
    }

    // Draw series polygons
    this.series.forEach(s => {
      const points = s.data.map((d, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const r = (d / maxValue) * radius;
        return [
          centerX + Math.cos(angle) * r,
          centerY + Math.sin(angle) * r
        ];
      });

      this.svg.append('polygon')
        .attr('points', points.map(p => p.join(',')).join(' '))
        .attr('fill', s.color)
        .attr('fill-opacity', 0.3)
        .attr('stroke', s.color)
        .attr('stroke-width', 2)
        .attr('data-series', s.label)
        .call(polygon => this.attachTooltip(polygon as any));
    });

    this.renderLegends();
  }
}