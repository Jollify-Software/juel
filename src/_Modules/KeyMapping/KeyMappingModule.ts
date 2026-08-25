import { KeyMap } from "./KeyMap";

function allTrue(obj) {
    for (var o in obj) {
        if (!obj[o]) return false;
    }
    return true;
}

module KeyMapping {
    let keyMaps: KeyMap[] = [];

    export var clear = () => {
        keyMaps = [];
    }

    export var addKeyMap = (map: KeyMap) => {
        let obj = {};
        // Set all of the keys down to false
        map.keys.forEach(x => obj[x] = false);
        map.keysDown = obj;
        keyMaps.push(map);
    }

    export var init = () => {
        document.addEventListener("keyup", e => {
            for (let map of keyMaps) {
                if (map.ctrl == e.ctrlKey && map.shift == e.shiftKey) {
                    if (e.key in map.keysDown) {
                        map.keysDown[e.key] = false;
                    }
                }
            }
        });
        document.addEventListener("keydown", e => {
            for (let map of keyMaps) {
                if (map.ctrl == e.ctrlKey && map.shift == e.shiftKey) {
                    if (e.key in map.keysDown) {
                        map.keysDown[e.key] = true;
                    }
                    if (map.selector && map.action && allTrue(map.keysDown)) {
                        let el = document.querySelector(map.selector) as HTMLElement;
                        switch (map.action) {
                            case "focus":
                                el.focus();
                                break;
                            case "click":
                                el.click();
                                break;
                        }
                    }
                }
            }
        });
    }
}

(<any>window).juel.keyMapping = KeyMapping;