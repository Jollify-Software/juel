/**
 * Checks if the input string is a valid data URL.
 */
export function isDataUrl(str: string): boolean {
    const dataUrlRegex = /^data:([a-z]+\/[a-z0-9\-\+\.]+)?(;[a-z\-]+\=[a-z0-9\-]+)*(;base64)?,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*?)$/i;
    return dataUrlRegex.test(str);
  }