export function getYouTubeVideoID(url: string): string | null {
    try {
        // Create a URL object to parse the input URL
        const parsedUrl = new URL(url);

        // Handle youtube.com URLs
        if (parsedUrl.hostname.includes('youtube.com')) {
            return parsedUrl.searchParams.get('v') || null;
        }

        // Handle youtu.be URLs
        if (parsedUrl.hostname.includes('youtu.be')) {
            return parsedUrl.pathname.slice(1) || null;
        }

        // If the URL is not a valid YouTube URL
        return null;
    } catch (e) {
        // If the input is not a valid URL
        return null;
    }
}