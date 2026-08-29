export enum ShadowEditorEvents {
  /** A value was committed — any edit, or an undo/redo/reset. */
  Changed = 'shadow-changed',
  /** Live value during a drag / slider scrub, before it is committed. */
  Preview = 'shadow-preview',
  /** A live interaction was abandoned; the value is back to where it started. */
  Cancelled = 'shadow-cancelled',
}
