import * as d3 from 'd3';
import { ChartStrategy } from './ChartStrategy';

export class GaugeChartStrategy extends ChartStrategy {
  render() {
    const width = this.width;
    const height = this.height;
    const margin = this.margin;
    const radius = Math.min(width, height) / 2 - Math.max(margin.left, margin.right, margin.top, margin.bottom);

    // Find global min/max for the gauge background
    const min = Math.min(...this.series.map(s => s.min ?? 0));
    const max = Math.max(...this.series.map(s => s.max ?? 100));

    const arc = d3.arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    const centerX = width / 2;
    const centerY = height / 2 + radius * 0.3;

    // Clear previous
    this.svg.selectAll('*').remove();

    // Draw background arc
    this.svg.append('path')
      .attr('d', arc as any)
      .attr('fill', '#eee')
      .attr('transform', `translate(${centerX},${centerY})`);

    // Draw needles for each series
    this.series.forEach((s, idx) => {
      const value = (s.data[0] ?? 0) as number;
      const sMin = s.min ?? min;
      const sMax = s.max ?? max;
      const percent = Math.max(0, Math.min(1, (value - min) / (max - min)));
      const needleLength = radius * 0.95;
      const needleAngle = -Math.PI / 2 + Math.PI * percent;
      const needleX = centerX + needleLength * Math.cos(needleAngle);
      const needleY = centerY + needleLength * Math.sin(needleAngle);

      // Draw needle
      this.svg.append('line')
        .attr('x1', centerX)
        .attr('y1', centerY)
        .attr('x2', needleX)
        .attr('y2', needleY)
        .attr('stroke', s.color ?? '#444')
        .attr('stroke-width', 3);

      // Draw value text for each needle
      this.svg.append('text')
        .attr('x', centerX + Math.cos(needleAngle) * (radius * 0.6))
        .attr('y', centerY + Math.sin(needleAngle) * (radius * 0.6))
        .attr('text-anchor', 'middle')
        .attr('font-size', radius * 0.15)
        .attr('fill', s.color ?? '#222')
        .text(s.label + ': ' + value);
    });

    // Draw center circle
    this.svg.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius * 0.08)
      .attr('fill', '#444');

    // Draw min/max labels
    this.svg.append('text')
      .attr('x', centerX - radius * 0.8)
      .attr('y', centerY + radius * 0.3)
      .attr('text-anchor', 'middle')
      .attr('font-size', radius * 0.12)
      .attr('fill', '#888')
      .text(min);

    this.svg.append('text')
      .attr('x', centerX + radius * 0.8)
      .attr('y', centerY + radius * 0.3)
      .attr('text-anchor', 'middle')
      .attr('font-size', radius * 0.12)
      .attr('fill', '#888')
      .text(max);

    // Draw tick marks (point intervals) on the arc
    const tickCount = 10; // Number of intervals (adjust as needed)
    const ticksGroup = this.svg.append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    const tickRadius = radius; // Use the arc's outer radius
    const tickLength = radius * 0.07; // Length of each tick

    for (let i = 0; i <= tickCount; i++) {
      const percent = i / tickCount;
      const angle = -Math.PI / 2 + Math.PI * percent;

      // Start at the arc's outer edge, go outward
      const x1 = tickRadius * Math.cos(angle);
      const y1 = tickRadius * Math.sin(angle);
      const x2 = (tickRadius + tickLength) * Math.cos(angle);
      const y2 = (tickRadius + tickLength) * Math.sin(angle);

      ticksGroup.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#888')
        .attr('stroke-width', 2);

      // Optional: Draw tick labels just outside the arc
      const labelValue = min + (max - min) * percent;
      ticksGroup.append('text')
        .attr('x', (tickRadius + tickLength + 10) * Math.cos(angle))
        .attr('y', (tickRadius + tickLength + 10) * Math.sin(angle) + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', radius * 0.10)
        .attr('fill', '#888')
        .text(Math.round(labelValue));
    }
  }
}