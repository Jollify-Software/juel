import st from "bundle-text:../_CommonStyles/RippleAnimation.less";
import { bind } from "./Bind";

export class RippleInitialiser {

  constructor(private element: HTMLElement, parent: HTMLElement | ShadowRoot) {
    this.element.style.position = 'relative';
    this.element.style.overflow = 'hidden';
    element.addEventListener('click', this.createRipple);
    let style = parent.querySelector('#juel-ripple-styles');
    if (!style) {
      style = document.createElement("style");
      style.textContent = st;
      parent.append(style);
    }
  }

  @bind
  createRipple(event) {
    console.log("Ripple")
    const rect = this.element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.setAttribute('part', 'ripple');
    ripple.classList.add("ripple");

    // Set the size of the ripple
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;

    // Position the ripple at the click point
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // Add ripple styles
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(0, 0, 0, 0.3)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.6s ease-out forwards';
    ripple.style.pointerEvents = 'none';

    // Append the ripple element
    this.element.appendChild(ripple);

    // Remove the ripple after animation
    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  }

  removeRipples = (el: HTMLElement) => {
    el.removeEventListener('click', this.createRipple);
  }
}