const iconifyCodes = [
    { code: 'tt', icon: 'tikTok' },
    { code: 'yt', icon: 'youtube', color: 'red' },
    { code: 'e', icon: 'envelope' },
    { code: 't', icon: 'phone' },
    { code: 'w', icon: 'globe' },
    { code: 'x', icon: 'x' },
    { code: 'fb', icon: 'facebook', color: 'blue' },
    { code: 'bs', icon: 'bluesky', color: 'blue' },
    { code: 'wa', icon: 'whatsapp', color: 'green' }
];

export function IconifyMap() {
    let pattern = '^(CODE) ?([\\w-]*)?: ?(\\(.*\\))?';
    return iconifyCodes.map(icon => {
        return {
            pattern: new RegExp(pattern.replace('CODE', icon.code)),
            icon: icon.icon,
            color: icon.color
        };
    });
}