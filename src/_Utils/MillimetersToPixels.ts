export function MillimetersToPixels(mm) {
    const dpi = window.devicePixelRatio * 96; // Assuming 96 DPI as a base
    return (mm / 25.4) * dpi;
}