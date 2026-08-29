export enum PositionEditorEvents {
  /** A value was committed — a pick, a drag release, or an undo/redo/reset. */
  Changed = 'position-changed',
  /** Live value during a drag, before it is committed to history. */
  Preview = 'position-preview',
  /** Picking was abandoned (Esc or right-click); the value is back to where it started. */
  Cancelled = 'position-cancelled',
}
