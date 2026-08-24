export module AudioModule {
    let audios: { [id: string]: HTMLAudioElement };

    // play() resumes a paused src instead of restarting it — a paused src
    // stays tracked in `audios` (unlike a stopped one, which is forgotten)
    // specifically so this works.
    export var play = (src: string): boolean => {
        if (!audios) {
            audios = {};
        }
        if (src in audios) {
            const audio = audios[src];
            if (!audio.paused) {
                return false;
            }
            audio.play().catch((err) => onPlayRejected(src, err));
            return true;
        }

        let audio = new Audio(src);
        audios[src] = audio;
        audio.onended = () => forget(src);
        // A failed load (bad src, network error) never fires onended,
        // and a rejected play() (e.g. blocked by autoplay policy) never
        // starts playing at all — either way, without this the src stays
        // marked "in progress" forever and can never be played again.
        audio.onerror = () => forget(src);
        audio.play().catch((err) => onPlayRejected(src, err));
        return true;
    }

    // Pauses in place — the src stays tracked, so play(src) resumes it.
    export var pause = (src: string): boolean => {
        if (!audios || !(src in audios)) {
            return false;
        }
        audios[src].pause();
        return true;
    }

    // Pauses and rewinds to the start, then forgets the src entirely — a
    // subsequent play(src) starts it fresh rather than resuming.
    export var stop = (src: string): boolean => {
        if (!audios || !(src in audios)) {
            return false;
        }
        const audio = audios[src];
        audio.pause();
        audio.currentTime = 0;
        forget(src);
        return true;
    }

    // The src keys currently tracked — playing or paused, but not stopped
    // (stopped sources are forgotten, not just reset).
    export var list = (): string[] => {
        return audios ? Object.keys(audios) : [];
    }

    export var isPlaying = (src: string): boolean => {
        return !!(audios && src in audios && !audios[src].paused);
    }

    function forget(src: string): void {
        delete audios[src];
    }

    // A play() promise rejects with AbortError when it's interrupted by an
    // immediate pause() — that's not a real failure, so don't forget the
    // src (it's still validly tracked as paused). Any other rejection
    // (blocked autoplay, decode error, etc.) is a genuine failure.
    function onPlayRejected(src: string, err: unknown): void {
        if (err instanceof DOMException && err.name === "AbortError") {
            return;
        }
        forget(src);
    }
}
