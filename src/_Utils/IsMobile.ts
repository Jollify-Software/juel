export function IsMobile(): boolean {
    if ('isMobile' in window) {
        return (window as any).isMobile;
    } else {
        window['isMobile'] = window.matchMedia('(max-device-width: 500px)').matches ||
        window.matchMedia('(max-device-height: 500px)').matches;
        return window['isMobile'];
    }
}