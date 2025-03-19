export type FloatingInstance = {
    update: () => Promise<void>;
    destroy: () => void;
}