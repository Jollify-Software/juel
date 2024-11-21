import { ToastOptions } from "./ToastOptions";
import Styles from 'bundle-text:./Toast.less';

export class Toast {
    private container: HTMLElement | null;
  
    constructor() {
      this.container = null;
      this.initStyles();
      this.initContainer();
    }
  
    private initContainer(): void {
      if (!this.container) {
        this.container = document.createElement("div");
        this.container.id = "toast-container";
        this.container.style.position = "fixed";
        this.container.style.bottom = "20px";
        this.container.style.right = "20px";
        this.container.style.zIndex = "1000";
        this.container.style.display = "flex";
        this.container.style.flexDirection = "column";
        this.container.style.gap = "10px";
        document.body.appendChild(this.container);
      }
    }

    initStyles() {
        let style = document.head.querySelector("#juel-toast-styles");
        if (!style) {
            style = document.createElement("style");
            style.id = "juel-toast-styles";
            style.textContent = Styles;
            document.head.append(style);
        }

    }
  
    public show({ message, duration = 3000, type = "info" }: ToastOptions): void {
      const toastElement = document.createElement("div");
      toastElement.innerText = message;
  
      // Apply styles based on type
      toastElement.style.padding = "10px 20px";
      toastElement.style.color = "#fff";
      toastElement.style.borderRadius = "5px";
      toastElement.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
      toastElement.style.fontSize = "14px";
      toastElement.style.animation = "fade-in-out 0.3s ease";
  
      switch (type) {
        case "success":
          toastElement.style.backgroundColor = "#4caf50"; // Green
          break;
        case "error":
          toastElement.style.backgroundColor = "#f44336"; // Red
          break;
        case "warning":
          toastElement.style.backgroundColor = "#ff9800"; // Orange
          break;
        default:
          toastElement.style.backgroundColor = "#2196f3"; // Blue
      }
  
      // Add the toast to the container
      this.container?.appendChild(toastElement);
  
      // Remove the toast after the specified duration
      setTimeout(() => {
        toastElement.style.animation = "fade-out 0.3s ease";
        setTimeout(() => {
          toastElement.remove();
        }, 300); // Wait for fade-out animation to complete
      }, duration);
    }
  }