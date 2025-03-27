/**
 * Extracts points from a path's 'd' attribute.
 * @param {string} dAttr - The 'd' attribute of the path.
 * @returns {Array} - Array of coordinate pairs [[x1, y1], [x2, y2], ...]
 */
export function extractPathPoints(dAttr: string): number[][] {
    const pathCommands = dAttr.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi); // Split into commands
    const points: number[][] = [];
    let currentPoint = [0, 0];

    pathCommands.forEach(command => {
        const type = command[0];
        const coords = command
            .slice(1)
            .trim()
            .match(/-?\d*\.?\d+(?=[\s,]|$)/g) // Match numbers, including negatives and decimals
            ?.map(Number) || [];

        switch (type) {
            case 'M': // MoveTo absolute
            case 'L': // LineTo absolute
                for (let i = 0; i < coords.length; i += 2) {
                    currentPoint = [coords[i], coords[i + 1]];
                    points.push([...currentPoint]);
                }
                break;
            case 'H': // Horizontal LineTo absolute
                coords.forEach(x => {
                    currentPoint = [x, currentPoint[1]];
                    points.push([...currentPoint]);
                });
                break;
            case 'V': // Vertical LineTo absolute
                coords.forEach(y => {
                    currentPoint = [currentPoint[0], y];
                    points.push([...currentPoint]);
                });
                break;
            case 'C': // Cubic Bezier Curve absolute
                for (let i = 0; i < coords.length; i += 6) {
                    currentPoint = [coords[i + 4], coords[i + 5]]; // End point of the curve
                    points.push([...currentPoint]);
                }
                break;
            case 'Q': // Quadratic Bezier Curve absolute
                for (let i = 0; i < coords.length; i += 4) {
                    currentPoint = [coords[i + 2], coords[i + 3]]; // End point of the curve
                    points.push([...currentPoint]);
                }
                break;
            case 'T': // Smooth Quadratic Bezier Curve absolute
                for (let i = 0; i < coords.length; i += 2) {
                    currentPoint = [coords[i], coords[i + 1]]; // End point of the curve
                    points.push([...currentPoint]);
                }
                break;
            case 'A': // Elliptical Arc absolute
                for (let i = 0; i < coords.length; i += 7) {
                    currentPoint = [coords[i + 5], coords[i + 6]]; // End point of the arc
                    points.push([...currentPoint]);
                }
                break;
            case 'Z': // ClosePath
                // Typically, Z closes the path by connecting to the start point.
                break;
            // Add more cases for other path commands (Q, T, A, etc.) if needed.
        }
    });

    return points;
}