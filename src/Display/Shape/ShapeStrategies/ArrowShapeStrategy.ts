import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class ArrowShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        const shaftWidth = width * 0.4; // Shaft width is 40% of the element's width
        const headHeight = height * 0.5; // Head height is 50% of the element's height
        const headWidth = width; // Head width matches the element's width

        const points = `
        0,0
        ${headWidth / 2},${headHeight}
        ${shaftWidth / 2},${headHeight}
        ${shaftWidth / 2},${height}
        ${-shaftWidth / 2},${height}
        ${-shaftWidth / 2},${headHeight}
        ${-headWidth / 2},${headHeight}
      `;

        let shape = draw.polygon(points.trim()).center(width / 2, height / 2);
        return shape;
    }

}