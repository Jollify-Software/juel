import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class CircleShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        let size = Math.max(width, height);
        const center = size / 2;
        let shape = draw.circle(size).center(center, center);
        return shape;
    }

}