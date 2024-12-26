import { MapModeType } from "../MapModeType";

export interface IMapProvider {
    init: (element: HTMLElement) => Promise<void>;
    getMap(): any;
}