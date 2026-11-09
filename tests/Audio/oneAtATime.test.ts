import { OneAtATime, isLayered } from '../../src/_Modules/Audio/OneAtATime';

// jsdom has no media playback, so each <audio> gets a stand-in for `paused`,
// `pause()` and `currentTime`, and "starting" one means firing its `play` event
// (the event the browser fires when play() is called).
function sound(attrs: Record<string, string> = {}, inDocument = true): HTMLAudioElement {
    const audio = document.createElement('audio');
    for (const [name, value] of Object.entries(attrs)) audio.setAttribute(name, value);
    let paused = true;
    let time = 0;
    Object.defineProperty(audio, 'paused', { get: () => paused, configurable: true });
    Object.defineProperty(audio, 'currentTime', { get: () => time, set: (t: number) => { time = t; }, configurable: true });
    audio.pause = jest.fn(() => { paused = true; });
    (audio as any).start = (at = 12) => { paused = false; time = at; audio.dispatchEvent(new Event('play')); };
    if (inDocument) document.body.append(audio);
    return audio;
}
const start = (audio: HTMLAudioElement, at?: number) => (audio as any).start(at);

describe('juel.audio.oneAtATime', () => {
    beforeEach(() => OneAtATime.enable());
    afterEach(() => {
        OneAtATime.disable();
        document.body.innerHTML = '';
    });

    it('stops the cue that was playing when another starts, and rewinds it', () => {
        const a = sound(), b = sound();
        start(a);
        start(b);
        expect(a.paused).toBe(true);
        expect(a.currentTime).toBe(0);
        expect(b.paused).toBe(false);
    });

    it('only pauses a visible player (controls), so it can carry on from where it was', () => {
        const player = sound({ controls: '' }), cue = sound();
        start(player, 40);
        start(cue);
        expect(player.paused).toBe(true);
        expect(player.currentTime).toBe(40);
    });

    it('lets a layered sound play over the others, and the others leave it playing', () => {
        const rain = sound({ layered: '' }), a = sound(), b = sound();
        start(rain);
        start(a);
        expect(rain.paused).toBe(false);
        start(b);
        expect(rain.paused).toBe(false);
        expect(a.paused).toBe(true);
    });

    it('a layered sound starting stops nothing', () => {
        const a = sound(), bell = sound({ 'data-layered': '' });
        start(a);
        start(bell);
        expect(a.paused).toBe(false);
    });

    it('reads layered, data-layered and layered="false"', () => {
        expect(isLayered(sound())).toBe(false);
        expect(isLayered(sound({ layered: '' }))).toBe(true);
        expect(isLayered(sound({ layered: 'true' }))).toBe(true);
        expect(isLayered(sound({ 'data-layered': '' }))).toBe(true);
        expect(isLayered(sound({ layered: 'false' }))).toBe(false);
        expect(isLayered(sound({ 'data-layered': ' False ' }))).toBe(false);
    });

    it('takes in sounds outside the document once tracked (juel.audio.play makes those)', () => {
        const page = sound(), loose = sound({}, false);
        OneAtATime.track(loose);
        start(page);
        start(loose);
        expect(page.paused).toBe(true);
        start(page);
        expect(loose.paused).toBe(true);
        OneAtATime.untrack(loose);
    });

    it('does nothing once disabled: sounds play over each other, as plain HTML does', () => {
        OneAtATime.disable();
        const a = sound(), b = sound();
        start(a);
        start(b);
        expect(a.paused).toBe(false);
        expect(OneAtATime.isEnabled()).toBe(false);
    });

    it('leaves video alone', () => {
        const a = sound();
        start(a);
        const video = document.createElement('video');
        document.body.append(video);
        video.dispatchEvent(new Event('play'));
        expect(a.paused).toBe(false);
    });
});
