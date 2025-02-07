import { extractPoints } from "./extractPoint";

        /**
         * Normalizes two SVG.js shape objects so both have the same number of points.
         * @param {SVG.Polygon} shape1 - First shape.
         * @param {SVG.Polygon} shape2 - Second shape.
         * @returns {Array[]} - Both point arrays normalized to the same length.
         */
   export function normalizePoints(shape1, shape2) {
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

    // Update the shapes with normalized points
    shape1.plot(len1 < len2 ? fewer : more);
    shape2.plot(len1 < len2 ? more : fewer);

    return [shape1, shape2];
}