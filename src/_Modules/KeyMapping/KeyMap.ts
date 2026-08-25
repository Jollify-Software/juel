export interface KeyMap {
    ctrl: boolean;
    shift: boolean;
    keys: string[];
    keysDown: { [id: string]: boolean; };
    selector: string;
    action: string;
    functionName: string;
    function: string;
}