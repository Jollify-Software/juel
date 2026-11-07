const PhoneScreen = ['(max-device-width: 500px)', '(max-device-height: 500px)'];

/** Whether the screen is a phone's now. A folding phone stops being one when it's opened out, so this is never remembered. */
export function IsMobile(): boolean {
    const mobile = PhoneScreen.some(query => window.matchMedia(query).matches);
    window['isMobile'] = mobile;
    return mobile;
}

/** Calls `listener` when {@link IsMobile}'s answer changes; returns what stops it. */
export function onMobileChange(listener: (mobile: boolean) => void): () => void {
    let last = IsMobile();
    const changed = () => {
        const now = IsMobile();
        if (now !== last) {
            last = now;
            listener(now);
        }
    };
    const queries = PhoneScreen.map(query => window.matchMedia(query));
    queries.forEach(query => query.addEventListener('change', changed));
    return () => queries.forEach(query => query.removeEventListener('change', changed));
}
