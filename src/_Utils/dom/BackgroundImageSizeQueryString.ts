export function backgroundImageSizeQueryString(element: HTMLElement): void {
    // Get the computed styles of the element
    const computedStyle = window.getComputedStyle(element);
    const backgroundImage = computedStyle.backgroundImage;

    // Check if the background-image is a URL
    const urlMatch = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    if (!urlMatch || urlMatch.length < 2) {
        console.error("No valid URL found in background-image.");
        return;
    }

    // Extract the URL
    const url = urlMatch[1];

    console.log("Imgage Url " + url)

    // Get the element's dimensions
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    if (!width || !height) {
        console.error("Element's width or height is invalid.");
        return;
    }

    // Append or update query parameters for width and height
    const updatedUrl = new URL(url, window.location.href);
    updatedUrl.searchParams.set("width", width.toString());
    updatedUrl.searchParams.set("height", height.toString());

    // Update the background-image style
    element.style.backgroundImage = `url("${updatedUrl.toString()}")`;
}