export interface ToastOptions {
    message: string;
    duration?: number; // Duration in milliseconds
    type?: "success" | "error" | "info" | "warning"; // Type of toast
  }