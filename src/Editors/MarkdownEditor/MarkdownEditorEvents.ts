export const MarkdownEditorEvents = {
    /** The user changed the text: {@link MarkdownContentChanged}. */
    contentChanged: 'content-changed',
    /** The old name of `content-changed`; still fired for one more release. */
    legacyContentChanged: 'ContentChanged',
    /** The cursor moved: {@link MarkdownCursor}. */
    cursorChanged: 'cursor-changed',
    /** The name on the front-matter chip was clicked (`front-matter-chip`). */
    frontMatterOpen: 'front-matter-open',
} as const;

/** `content-changed` detail. */
export interface MarkdownContentChanged {
    content: string;
    /**
     * Where an offset in the text before this change is now, or null if the
     * character at it was deleted. An insertion exactly at the offset lands
     * before it.
     */
    mapOffset(offset: number): number | null;
}

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
