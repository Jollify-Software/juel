export function Vh() {
    let root = document.documentElement;

    function updateRealViewportDimensions() {
        root.style.setProperty('--vh', (window.innerHeight / 100) + "px");
    }
    updateRealViewportDimensions()
    const vhChangeEventTypes = [
        "scroll",
        "resize",
        "fullscreenchange",
        "fullscreenerror",
        "touchcancel",
        "touchend",
        "touchmove",
        "touchstart",
        "mozbrowserscroll",
        "mozbrowserscrollareachanged",
        "mozbrowserscrollviewchange",
        "mozbrowserresize",
        "MozScrolledAreaChanged",
        "mozbrowserresize",
        "orientationchange"
    ]
    vhChangeEventTypes.forEach(function (type) {
        window.addEventListener(type, event => updateRealViewportDimensions());
    })
}