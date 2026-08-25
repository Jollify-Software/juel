export interface ToastOptions {
    message: string;
    duration?: number; // Duration in milliseconds
    type?: "success" | "error" | "info" | "warning"; // Type of toast
    // When true, `message` is rendered as HTML instead of plain text.
    // Off by default — only opt in for markup you trust, since it's
    // rendered via innerHTML with no sanitisation.
    html?: boolean;
  }