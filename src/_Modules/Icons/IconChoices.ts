// The icons offered for content (juel-icon-picker: a diagram's boxes, say), named in plain words and
// searchable by what people would call them. Every glyph here is bundled in Lucide.ts (a test checks). Pure.

export interface IconChoice {
    glyph: string;
    label: string;
    /** Other words it's found by. */
    words?: string;
}

const choice = (name: string, label: string, words?: string): IconChoice => ({ glyph: `lucide-${name}`, label, words });

export const IconChoices: readonly IconChoice[] = [
    choice('user', 'Person', 'people employee staff member'),
    choice('users', 'Team', 'people group staff department'),
    choice('handshake', 'Handshake', 'deal partner agreement'),
    choice('briefcase', 'Briefcase', 'work business job'),
    choice('building-2', 'Building', 'office company'),
    choice('house', 'Home', 'house'),
    choice('mail', 'Email', 'mail message letter'),
    choice('phone', 'Phone', 'call telephone'),
    choice('message-circle', 'Chat', 'message talk speech comment'),
    choice('megaphone', 'Announcement', 'marketing megaphone'),
    choice('calendar', 'Calendar', 'date schedule event'),
    choice('clock', 'Clock', 'time hours'),
    choice('flag', 'Flag', 'milestone goal'),
    choice('target', 'Target', 'goal aim objective'),
    choice('rocket', 'Rocket', 'launch start'),
    choice('trophy', 'Trophy', 'win prize award'),
    choice('award', 'Award', 'medal prize badge'),
    choice('star', 'Star', 'favourite rating'),
    choice('heart', 'Heart', 'love care health'),
    choice('lightbulb', 'Idea', 'light bulb innovation'),
    choice('sparkles', 'Sparkles', 'new magic ai'),
    choice('zap', 'Lightning', 'power energy fast'),
    choice('check', 'Tick', 'done yes approved check'),
    choice('list-checks', 'Checklist', 'tasks to do'),
    choice('shield', 'Shield', 'security safety protect'),
    choice('lock', 'Lock', 'security private'),
    choice('key', 'Key', 'access password'),
    choice('search', 'Search', 'find magnifying glass'),
    choice('settings', 'Settings', 'cog gear options'),
    choice('wrench', 'Wrench', 'tool repair maintenance'),
    choice('pencil', 'Pencil', 'edit write draft'),
    choice('file-text', 'Document', 'file paper report'),
    choice('book-open', 'Book', 'read learn manual'),
    choice('graduation-cap', 'Education', 'school training learn'),
    choice('presentation', 'Presentation', 'slides talk'),
    choice('monitor', 'Monitor', 'screen computer'),
    choice('laptop', 'Laptop', 'computer'),
    choice('smartphone', 'Mobile', 'phone app'),
    choice('code', 'Code', 'software developer'),
    choice('database', 'Database', 'data storage'),
    choice('server', 'Server', 'hosting computer'),
    choice('cloud', 'Cloud', 'online hosting'),
    choice('globe', 'Globe', 'world web internet international'),
    choice('map-pin', 'Location', 'place map pin address'),
    choice('truck', 'Delivery', 'truck van lorry shipping'),
    choice('package', 'Package', 'box parcel product'),
    choice('shopping-cart', 'Shopping', 'cart basket buy sales'),
    choice('credit-card', 'Payment', 'card pay money'),
    choice('banknote', 'Money', 'cash finance bank note'),
    choice('pound-sterling', 'Pounds', 'money finance gbp'),
    choice('chart-column', 'Chart', 'graph bars results'),
    choice('chart-pie', 'Pie chart', 'graph share'),
    choice('trending-up', 'Growth', 'increase rising graph'),
    choice('scale', 'Scales', 'law legal balance justice'),
    choice('leaf', 'Leaf', 'nature green environment'),
    choice('sprout', 'Sprout', 'grow plant start'),
    choice('recycle', 'Recycle', 'green environment'),
    choice('sun', 'Sun', 'weather day'),
    choice('camera', 'Camera', 'photo picture'),
    choice('video', 'Video', 'film camera'),
    choice('music', 'Music', 'song audio'),
    choice('palette', 'Design', 'palette colour art'),
    choice('bell', 'Bell', 'alert notification'),
    choice('circle', 'Circle', 'shape dot'),
];

/** The choices whose name or other words have every word of `search`, in their usual order. */
export function filterIconChoices(icons: readonly IconChoice[], search: string): IconChoice[] {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    return icons.filter(icon => {
        const text = `${icon.label} ${icon.words ?? ''} ${icon.glyph.replace(/^lucide-/, '').replace(/-/g, ' ')}`.toLowerCase();
        return terms.every(term => text.includes(term));
    });
}
