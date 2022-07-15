export module AudioModule {
    let audios: { [id: string]: HTMLAudioElement };

    export var play = (src: string) => {
    if ((!audios) || !(src in audios)) {
            let audio = new Audio(src);
            if (!audios) {
                audios = {};
            }
            audios[src] = audio;
            audio.onended = () => {
                delete audios[src];
            }
            audio.play();
            return true;
        } else {
            return false;
        }
    }
}