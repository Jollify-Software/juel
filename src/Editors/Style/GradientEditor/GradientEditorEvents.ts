export enum GradientEditorEvents {
  /** A value was committed — any edit, or an undo/redo/reset. */
  Changed = 'gradient-changed',
  /** Live value during a drag (stop move, angle scrub), before it is committed. */
  Preview = 'gradient-preview',
  /** A live interaction was abandoned; the value is back to where it started. */
  Cancelled = 'gradient-cancelled',
}
