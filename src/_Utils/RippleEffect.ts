import st from "bundle-text:../_CommonStyles/RippleAnimation.less";

export class RippleEffect {

  static init(parent: HTMLElement | ShadowRoot) {
    let style = parent.querySelector('#juel-ripple-styles');
    if (!style) {
      style = document.createElement("style");
      style.textContent = st;
      parent.prepend(style);
    }
  }

  static createRipple(event: MouseEvent) {
    let element = event.currentTarget as HTMLElement;
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    const rect = element.getBoundingClientRect();
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
    element.appendChild(ripple);

    // Remove the ripple after animation
    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  }
}