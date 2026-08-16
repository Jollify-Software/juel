export function AnimateStyle(el: HTMLElement, props: Record<string, string | number>, duration = 600): Promise<void> {
    let target: Keyframe = {};
    for (const [prop, value] of Object.entries(props)) {
        target[prop] = typeof value === "number" ? `${value}px` : value;
    }
    let animation = el.animate([target], { duration, easing: "ease", fill: "forwards" });
    return animation.finished.then(() => {
        Object.assign(el.style, target);
        animation.cancel();
    });
}
