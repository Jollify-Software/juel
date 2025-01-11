export type MediaSourceType = { type: 'video' | 'audio' | 'image'; platform?: string };

// Function to check if a source string is a video or audio source
export function isMediaSource(source: string): { type: 'video' | 'audio' | 'image'; platform?: string } {
    // Define video file extensions and platforms
    const videoFileExtensions = ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv"];
    const videoPlatforms = ["youtube.com", "youtu.be", "vimeo.com", "dailymotion.com"];
  
    // Define audio file extensions and platforms
    const audioFileExtensions = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
    const audioPlatforms = ["soundcloud.com", "spotify.com", "bandcamp.com"];
  
    try {
      // Check if the source is a URL
      const url = new URL(source);
      const hostname = url.hostname.toLowerCase();
  
      // Check for video platforms
      if (videoPlatforms.some(platform => hostname.includes(platform))) {
        return { type: 'video', platform: hostname };
      }
  
      // Check for audio platforms
      if (audioPlatforms.some(platform => hostname.includes(platform))) {
        return { type: 'audio', platform: hostname };
      }
    } catch {
      // If source is not a URL, continue to check file extensions
    }
  
    // Check for local file extensions
    const extensionMatch = source.match(/\.([a-z0-9]+)$/i);
    if (extensionMatch) {
      const extension = extensionMatch[1].toLowerCase();
  
      if (videoFileExtensions.includes(extension)) {
        return { type: 'video' };
      }
  
      if (audioFileExtensions.includes(extension)) {
        return { type: 'audio' };
      }
    }
  
    // Return unknown if no match is found
    return { type: 'image' };
  }