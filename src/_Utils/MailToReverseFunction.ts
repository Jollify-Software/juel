export function MailToReverse(address: string = null) {
    if (this) {
        let el = this as unknown as HTMLElement;
        if (!address) {
        if (el.dataset && el.dataset.email) {
                address = el.dataset.email;
            } else {
                address = el.textContent;
            }
        }
        location.href = `mailto:${(window as any).reverseString(address)}`;
    }
}