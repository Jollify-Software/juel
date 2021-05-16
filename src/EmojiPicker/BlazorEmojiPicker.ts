export module BlazorEmojiPickerFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let el = document.getElementById(id);
        if (el) {
            el.addEventListener('emojiSelected', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('OnEmojiSelected', event.detail.emoji)
            });
        }
    }
}