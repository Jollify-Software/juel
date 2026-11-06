// The ready-made shapes of <juel-shape-editor>: press, drag, there's your heart. Each is an ordinary closed path, so once
// drawn it's a mark like any other, and its points can be changed. Written here as a path's `d`, in any size: it's
// stretched to the box you drag.
import { markBox, type Box, type PathMark, type PathNode, type Pt } from './shapeModel';
import { parsePathData } from './shapeSvg';

export interface Preset { id: string; name: string; d: string }

export const Presets: Preset[] = [
    { id: 'heart', name: 'Heart', d: 'M50 100C20 75 0 55 0 30C0 12 13 0 28 0C38 0 46 6 50 15C54 6 62 0 72 0C87 0 100 12 100 30C100 55 80 75 50 100Z' },
    { id: 'speech', name: 'Speech bubble', d: 'M15 0H85C93 0 100 7 100 15V60C100 68 93 75 85 75H45L20 100L25 75H15C7 75 0 68 0 60V15C0 7 7 0 15 0Z' },
    { id: 'cloud', name: 'Cloud', d: 'M25 85C10 85 0 74 0 62C0 50 9 41 20 40C20 22 34 10 50 10C65 10 76 19 80 32C92 34 100 45 100 58C100 73 89 85 75 85Z' },
    { id: 'arrow-right', name: 'Arrow pointing right', d: 'M0 30H60V5L100 50L60 95V70H0Z' },
    { id: 'arrow-left', name: 'Arrow pointing left', d: 'M100 30H40V5L0 50L40 95V70H100Z' },
    { id: 'arrow-up', name: 'Arrow pointing up', d: 'M30 100V40H5L50 0L95 40H70V100Z' },
    { id: 'arrow-down', name: 'Arrow pointing down', d: 'M30 0V60H5L50 100L95 60H70V0Z' },
    { id: 'arrow-both', name: 'Arrow both ways', d: 'M0 50L25 10V32H75V10L100 50L75 90V68H25V90Z' },
    { id: 'cross', name: 'Plus', d: 'M35 0H65V35H100V65H65V100H35V65H0V35H35Z' },
    { id: 'lightning', name: 'Lightning', d: 'M60 0L15 55H45L35 100L85 40H55L70 0Z' },
    { id: 'drop', name: 'Drop', d: 'M50 0C65 25 85 45 85 65C85 85 69 100 50 100C31 100 15 85 15 65C15 45 35 25 50 0Z' },
    { id: 'moon', name: 'Moon', d: 'M65 0C35 5 15 25 15 50C15 75 35 95 65 100C50 85 42 68 42 50C42 32 50 15 65 0Z' },
];

/** The points of a ready-made shape, stretched to fill `box` exactly. An unknown id is the first one. */
export function presetNodes(id: string, box: Box): PathNode[] {
    const preset = Presets.find(p => p.id === id) ?? Presets[0];
    const nodes = parsePathData(preset.d)![0].nodes;
    const probe: PathMark = { id: 'p', kind: 'path', fill: null, stroke: null, width: 0, dash: 'solid', opacity: 1, nodes, closed: true };
    const from = markBox(probe);
    const fit = (p: Pt): Pt => ({ x: box.x + (p.x - from.x) / from.w * box.w, y: box.y + (p.y - from.y) / from.h * box.h });
    return nodes.map(n => ({ ...fit(n), ...(n.in ? { in: fit(n.in) } : {}), ...(n.out ? { out: fit(n.out) } : {}) }));
}
