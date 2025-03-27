import { SVG, Polygon, Path, Svg } from '@svgdotjs/svg.js';

/**
 * Converts an SVG.js Polygon to a Path element
 * @param polygon The Polygon element to convert
 * @returns A new Path element representing the same shape
 */
export function polygonToPath(polygon: Polygon): Path {
    const points = polygon.array().toArray();
    if (points.length === 0) {
        throw new Error('Polygon has no points');
    }

    // Construct the 'd' attribute of the path
    const d = points.map((point, index) => {
        const [x, y] = point;
        return index === 0 ? `M${x},${y}` : `L${x},${y}`;
    }).join(' ') + ' Z'; // Close the path

    // Ensure parent is an SVG element before calling .path()
    const parent = polygon.parent() as Svg;
    if (!parent || !(parent instanceof Svg)) {
        throw new Error('Polygon must be inside an SVG container');
    }

    return parent.path(d) as Path;
}

/**
 * Converts a string of coordinates to a Path element within a given SVG instance
 * @param coordinates The string of coordinates
 * @param svg The SVG instance to create the Path element in
 * @returns A new Path element representing the shape
 */
export function polygonStrToPath(coordinates: string, svg: Svg): Path {
    const points = coordinates.split(' ').map(coord => coord.split(',').map(Number));
    if (points.length === 0) {
        throw new Error('Coordinates string has no points');
    }

    // Construct the 'd' attribute of the path
    const d = points.map((point, index) => {
        const [x, y] = point;
        return index === 0 ? `M${x},${y}` : `L${x},${y}`;
    }).join(' ') + ' Z'; // Close the path

    return svg.path(d) as Path;
}