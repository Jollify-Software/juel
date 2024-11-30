import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class RectShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        let size = Math.max(width, height);
        const center = size / 2;
        let shape = draw
          .rect(width, height)
          .center(center, center);
        return shape;
    }

}