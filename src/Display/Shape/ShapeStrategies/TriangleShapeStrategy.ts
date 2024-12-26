import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class TriangleShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        let size = Math.max(width, height);
        const half = size / 2;
        const points = `${half},0 ${size},${size} 0,${size}`;
        let shape = draw!.polygon(points).center(half, half);
        return shape;
    }

}