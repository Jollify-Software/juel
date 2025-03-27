import { Path, Polygon, Shape, Svg } from "@svgdotjs/svg.js";
import { extractPoints } from "./extractPoint";

/**
 * Normalizes two SVG.js shape objects so both have the same number of points.
 * @param {SVG.Polygon} shape1 - First shape.
 * @param {SVG.Polygon} shape2 - Second shape.
 * @returns {Array[]} - Both point arrays normalized to the same length.
 */
export function normalizePoints(shape1: Shape, shape2: Shape) {
    let points1 = extractPoints(shape1);
    let points2 = extractPoints(shape2);

    let len1 = points1.length;
    let len2 = points2.length;

    if (len1 === len2) return [shape1, shape2]; // Already equal

    let fewer = len1 < len2 ? points1 : points2;
    let more = len1 < len2 ? points2 : points1;
    let diff = Math.abs(len1 - len2);

    // Duplicate last point to match lengths
    for (let i = 0; i < diff; i++) {
        fewer.push([...fewer[fewer.length - 1]]);
    }

    /**
     * Converts an array of points into a path's d attribute string.
     * @param {Array<number[]>} points - Array of points [x, y].
     * @returns {string} - Path d attribute string.
     */
    function convertPointsToPathD(points: number[][]): string {
        if (points.length === 0) return "";

        let d = `M ${points[0][0]} ${points[0][1]}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i][0]} ${points[i][1]}`;
        }
        d += " Z"; // Close the path
        return d;
    }

    // Helper function to update the shape or its child
    function updateShape(shape: Shape, points) {
        if (shape.type === "svg") {
            const svg = shape as Svg;
            let child = svg.findOne("polygon, path");
            console.log(child);
            console.log(points);
            if (child.type === "polygon") {
                (<Polygon>child).plot(points);
            } else if (child.type === "path") {
                const pathD = convertPointsToPathD(points);
                (<Path>child).plot(pathD);
            }
        } else if (shape.type === "polygon") {
            (<Polygon>shape).plot(points);
        } else if (shape.type === "path") {
            //const pathD = convertPointsToPathD(points);
            //(<Path>shape).plot(pathD); // Assuming plotPath is the equivalent for paths
        }
    }

    // Update the shapes with normalized points
    updateShape(shape1, len1 < len2 ? fewer : more);
    updateShape(shape2, len1 < len2 ? more : fewer);

    return [shape1, shape2];
}