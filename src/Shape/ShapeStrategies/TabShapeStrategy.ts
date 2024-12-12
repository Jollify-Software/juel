import { Svg, Shape } from "@svgdotjs/svg.js";
import { ShapeStrategy } from "./ShapeStrategy";

export class TabShapeStrategy implements ShapeStrategy {
    draw(draw: Svg, width: number, height: number): Shape {
        let size = Math.max(width, height);
        const tabWidth = size; // Full width of the tab
        const tabHeight = size * 0.6; // Height of the tab
        const cornerRadius = size * 0.2; // Radius for the semi-circular or rounded top
      
  // Create a path for the single tab
  const pathData = `
    M ${width / 2 - tabWidth / 2},${height / 2 + tabHeight / 2}
    L ${width / 2 - tabWidth / 2},${height / 2 - tabHeight / 2 + cornerRadius}
    Q ${width / 2 - tabWidth / 2},${height / 2 - tabHeight / 2} ${width / 2 - tabWidth / 2 + cornerRadius},${height / 2 - tabHeight / 2}
    L ${width / 2 + tabWidth / 2 - cornerRadius},${height / 2 - tabHeight / 2} 
    Q ${width / 2 + tabWidth / 2},${height / 2 - tabHeight / 2} ${width / 2 + tabWidth / 2},${height / 2 - tabHeight / 2 + cornerRadius}
    L ${width / 2 + tabWidth / 2},${height / 2 + tabHeight / 2}
    Z
  `;
      
        // Draw the tab shape
        return draw!.path(pathData);
    }

}