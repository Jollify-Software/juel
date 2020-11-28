export function IsMobile(): boolean {
    if ('isMobile' in window) {
        return (window as any).isMobile;
    } else {
        window['isMobile'] = window.matchMedia('(max-device-width: 600px)').matches;
    }
}