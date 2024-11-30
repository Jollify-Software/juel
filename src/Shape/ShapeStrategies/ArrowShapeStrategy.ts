import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class ArrowShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        let size = Math.max(width, height);

        const shaftWidth = size * 0.4; // Width of the arrow's shaft
        const headHeight = size * 0.4; // Height of the arrow's head
        const headWidth = size * 0.6; // Width of the arrow's head
      
        const points = `
          ${size / 2 - shaftWidth / 2},0
          ${size / 2 + shaftWidth / 2},0
          ${size / 2 + shaftWidth / 2},${size - headHeight}
          ${size / 2 + headWidth / 2},${size - headHeight}
          ${size / 2},${size}
          ${size / 2 - headWidth / 2},${size - headHeight}
          ${size / 2 - shaftWidth / 2},${size - headHeight}
        `;
      
        let shape = draw.polygon(points.trim()).center(size / 2, size / 2);
        return shape;
    }

}