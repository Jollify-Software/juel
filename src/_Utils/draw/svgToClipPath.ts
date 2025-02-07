export function svgToClipPath(svgElement: Element, width: number, height: number): string | null {
    const tagName = svgElement.tagName.toLowerCase();
  
    switch (tagName) {
        case 'path':
            const d = svgElement.getAttribute('d');
            return d ? `path('${d}')` : null;
  
        case 'rect': {
            const x = parseFloat(svgElement.getAttribute('x') || '0');
            const y = parseFloat(svgElement.getAttribute('y') || '0');
            const w = parseFloat(svgElement.getAttribute('width') || '0');
            const h = parseFloat(svgElement.getAttribute('height') || '0');
            return `inset(${(y / height) * 100}% ${(w / width) * 100}% ${(h / height) * 100}% ${(x / width) * 100}%)`;
        }
  
        case 'circle': {
            const cx = parseFloat(svgElement.getAttribute('cx') || '0');
            const cy = parseFloat(svgElement.getAttribute('cy') || '0');
            const r = parseFloat(svgElement.getAttribute('r') || '0');
            return `circle(${(r / width) * 100}% at ${(cx / width) * 100}% ${(cy / height) * 100}%)`;
        }
  
        case 'ellipse': {
            const cx = parseFloat(svgElement.getAttribute('cx') || '0');
            const cy = parseFloat(svgElement.getAttribute('cy') || '0');
            const rx = parseFloat(svgElement.getAttribute('rx') || '0');
            const ry = parseFloat(svgElement.getAttribute('ry') || '0');
            return `ellipse(${(rx / width) * 100}% ${(ry / height) * 100}% at ${(cx / width) * 100}% ${(cy / height) * 100}%)`;
        }
  
        case 'polygon':
        case 'polyline': {
            const points = svgElement.getAttribute('points');
            if (points) {
                const pointPairs = points.split(/\s+/).map(pair => {
                    const [x, y] = pair.split(',').map(coord => parseFloat(coord));
                    return `${(x / width) * 100}% ${(y / height) * 100}%`;
                });
                return `polygon(${pointPairs.join(', ')})`;
            }
            return null;
        }
  
        default:
            return null;
    }
  }