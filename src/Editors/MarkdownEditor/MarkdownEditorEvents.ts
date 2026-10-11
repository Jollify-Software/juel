export const MarkdownEditorEvents = {
    /** The user changed the text: `{ content }`. */
    contentChanged: 'content-changed',
    /** The old name of `content-changed`; still fired for one more release. */
    legacyContentChanged: 'ContentChanged',
    /** The cursor moved: {@link MarkdownCursor}. */
    cursorChanged: 'cursor-changed',
} as const;

/** `cursor-changed` detail: 0-based offset, 1-based line and column. */
export interface MarkdownCursor {
    offset: number;
    line: number;
    column: number;
}

/** A problem to underline with `setWarnings`. */
export interface MarkdownWarning {
    message: string;
    /** Start offset in the text. */
    from?: number;
    /** End offset; defaults to the end of the line `from` is on. */
    to?: number;
    severity?: 'error' | 'warning' | 'info' | 'hint';
}
