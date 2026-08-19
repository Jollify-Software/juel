export module AudioModule {
    let audios: { [id: string]: HTMLAudioElement };

    export var play = (src: string) => {
    if ((!audios) || !(src in audios)) {
            let audio = new Audio(src);
            if (!audios) {
                audios = {};
            }
            audios[src] = audio;
            const forget = () => {
                delete audios[src];
            };
            audio.onended = forget;
            // A failed load (bad src, network error) never fires onended,
            // and a rejected play() (e.g. blocked by autoplay policy) never
            // starts playing at all — either way, without this the src stays
            // marked "in progress" forever and can never be played again.
            audio.onerror = forget;
            audio.play().catch(forget);
            return true;
        } else {
            return false;
        }
    }
}
