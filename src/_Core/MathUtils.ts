import { Point } from "./Point";

export function degToRad(deg: number): number {
    return deg * (Math.PI / 180);
};
export function numberToString(n: number): string {
    if (Number.isInteger(n)) {
        return n.toString();
    } else if (n) {
        var r = (+n).toFixed(5);
        if (r.match(/\./)) {
            r = r.replace(/\.?0+$/, '');
        }
        return r;
    }
};
export function pointToString(point: Point) {
    return `${numberToString(point.x)} ${numberToString(point.y)}`;
};
export function getDegreePos(angleDeg: number, length: number) {
    return {
        x: Math.sin(degToRad(angleDeg)) * length,
        y: Math.cos(degToRad(angleDeg)) * length
    };
};