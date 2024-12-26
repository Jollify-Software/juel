import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class HexagonShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        let size = Math.max(width, height);
            const points = "50,0 100,25 100,75 50,100 0,75 0,25"; // Example points
        let shape = draw.polygon(points).center(size / 2, size / 2);
        return shape;
    }

}