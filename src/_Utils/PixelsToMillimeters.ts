export function PixelsToMillimeters(pixels) {
    const dpi = window.devicePixelRatio * 96; // Assuming 96 DPI as a base
    const millimetersPerInch = 25.4;
    return (pixels / dpi) * millimetersPerInch;
}