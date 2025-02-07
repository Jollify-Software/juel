        /**
         * Extracts an array of [x, y] points from an SVG.js polygon or polyline.
         * @param {SVG.Polygon} shape - The SVG.js shape.
         * @returns {Array} - Array of coordinate pairs [[x1, y1], [x2, y2], ...]
         */
export function extractPoints(shape) {
            const pointsAttr = shape.node.getAttribute('points'); // Get raw points string
            return pointsAttr
                .trim()
                .split(/\s+/) // Split by whitespace
                .map(point => point.split(',').map(Number)); // Convert to array of numbers
        }