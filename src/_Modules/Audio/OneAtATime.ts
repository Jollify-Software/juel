// juel.audio.oneAtATime: one sound at a time on the page.
//
// When an <audio> starts playing, every other <audio> that is playing stops,
// unless one of the two is marked `layered`. A pitch's gold-star cues are the
// case: click one star, then another, and the first cue stops instead of both
// playing over each other. It works however the sound was started:
// `juel-trigger-action action="play"`, the element's own controls, Jetty's
// slide sounds, a script, or `juel.audio.play(src)`.
//
//     <audio src="cue.mp3"></audio>             one at a time (the default)
//     <audio src="rain.mp3" layered></audio>    plays over the others; others don't stop it
//
// `data-layered` works as well as `layered` (for pages that must be valid HTML).
// `layered="false"` is the same as leaving it out.
//
// A stopped sound is paused and rewound, so its cue starts from the beginning
// next time. An <audio controls> (a visible player) is only paused, so whoever
// is listening can carry on from where it stopped.
//
// Video is left alone: a video's picture freezing because a cue started would
// be a surprise. Only <audio> elements in the page (not inside a component's
// shadow root) and the sounds juel.audio.play() makes take part.
//
// On once juel.js loads; `juel.audio.oneAtATime.disable()` turns it off.

const detached = new Set<HTMLAudioElement>();
let enabled = false;

export function isLayered(audio: HTMLAudioElement): boolean {
    const value = audio.getAttribute("layered") ?? audio.getAttribute("data-layered");
    return value !== null && value.trim().toLowerCase() !== "false";
}

function onPlay(event: Event): void {
    const started = event.target;
    if (!enabled || !(started instanceof HTMLAudioElement) || isLayered(started)) return;
    const others = new Set<HTMLAudioElement>(detached);
    started.ownerDocument?.querySelectorAll("audio").forEach(audio => others.add(audio));
    for (const other of others) {
        if (other === started || other.paused || isLayered(other)) continue;
        other.pause();
        if (!other.hasAttribute("controls")) {
            try { other.currentTime = 0; } catch { /* not loaded yet: nothing to rewind */ }
        }
    }
}

export namespace OneAtATime {
    /** Turns the rule on (juel.js does this as it loads). */
    export function enable(): void {
        if (enabled) return;
        enabled = true;
        // `play` doesn't bubble, but a capturing listener on the document still sees it.
        document.addEventListener("play", onPlay, true);
    }

    /** Turns it off: sounds play over each other again, as plain HTML does. */
    export function disable(): void {
        enabled = false;
        document.removeEventListener("play", onPlay, true);
    }

    export function isEnabled(): boolean {
        return enabled;
    }

    /**
     * A sound that isn't in the document (`new Audio(src)`, as juel.audio.play makes)
     * takes part too once tracked: it stops others, and others stop it.
     */
    export function track(audio: HTMLAudioElement): void {
        if (detached.has(audio)) return;
        detached.add(audio);
        audio.addEventListener("play", onPlay);
    }

    export function untrack(audio: HTMLAudioElement): void {
        detached.delete(audio);
        audio.removeEventListener("play", onPlay);
    }

    export var layered = isLayered;
}
