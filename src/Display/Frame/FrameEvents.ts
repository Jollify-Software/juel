export const FrameEvents = {
    /** A message from the framed page: {@link FrameMessageDetail}. */
    message: 'frame-message',
    /** The frame on show loaded, or a buffered frame was swapped in: `{ frame }`. */
    load: 'frame-load',
} as const;

/** `frame-message` detail. */
export interface FrameMessageDetail {
    /** What the page posted. */
    data: any;
    /** True when it came from the buffered frame still loading behind. */
    pending: boolean;
    /** Posts back to the frame that sent this message. */
    reply(data: unknown): void;
}
