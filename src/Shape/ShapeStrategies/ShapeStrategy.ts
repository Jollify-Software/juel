import { Shape, Svg } from "@svgdotjs/svg.js";
import { RectShapeStrategy } from "./RectShapeStrategy";
import { CircleShapeStrategy } from "./CircleShapeStrategy";
import { TriangleShapeStrategy } from "./TriangleShapeStrategy";
import { HexagonShapeStrategy } from "./HexagonShapeStrategy";
import { ArrowShapeStrategy } from "./ArrowShapeStrategy";
import { TabShapeStrategy } from "./TabShapeStrategy";

export interface ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape
}
export var ShapeStrategies = {
    "rect": new RectShapeStrategy(),
    "circle": new CircleShapeStrategy(),
    "triangle": new TriangleShapeStrategy(),
    "hexagon": new HexagonShapeStrategy(),
    "arrow": new ArrowShapeStrategy(),
    "tab": new TabShapeStrategy()
};