import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class ArrowShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        let size = Math.max(width, height);

        const shaftWidth = size * 0.4; // Width of the arrow's shaft
        const headHeight = size * 0.4; // Height of the arrow's head
        const headWidth = size * 0.6; // Width of the arrow's head
      
        const points = `
        0,${height / 2 - size / 2}
        ${headWidth},${height / 2 - size / 2 + headHeight}
        ${shaftWidth},${height / 2 - size / 2 + headHeight}
        ${shaftWidth},${height / 2 + size / 2}
        ${-shaftWidth},${height / 2 + size / 2}
        ${-shaftWidth},${height / 2 - size / 2 + headHeight}
        ${-headWidth},${height / 2 - size / 2 + headHeight}
      `;
      
        let shape = draw.polygon(points.trim()).center(size / 2, size / 2);
        return shape;
    }

}