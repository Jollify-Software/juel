import { PointArrayAlias, Shape } from "@svgdotjs/svg.js";
import { extractPathPoints } from "./extractPathPoints";

/**
 * Extracts an array of [x, y] points from an SVG.js polygon, polyline, or path.
 * If the node is an SVG element, it finds the first polygon, polyline, or path child.
 * @param {SVG.Polygon | SVG.Path | SVG.Element} shape - The SVG.js shape.
 * @returns {Array} - Array of coordinate pairs [[x1, y1], [x2, y2], ...]
 */
export function extractPoints(shape: Shape): number[][] {
    let node = shape.node;

    // If the node is an SVG element, find the first polygon, polyline, or path child
    if (node.tagName === 'svg') {
        node = node.querySelector('polygon, polyline, path');
        if (!node) {
            throw new Error('No polygon, polyline, or path found in the SVG element.');
        }
    }

    // Handle polygon or polyline with points attribute
    if (node.tagName === 'polygon' || node.tagName === 'polyline') {
        const pointsAttr = node.getAttribute('points'); // Get raw points string
        return pointsAttr
            .trim()
            .split(/\s+/) // Split by whitespace
            .map(point => point.split(',').map(Number)); // Convert to array of numbers
    }

    // Handle path with d attribute
    if (node.tagName === 'path') {
        const dAttr = node.getAttribute('d'); // Get raw d string
        if (!dAttr) {
            throw new Error('Path element is missing "d" attribute.');
        }
        return extractPathPoints(dAttr);
    }

    throw new Error('Unsupported SVG node type.');
}