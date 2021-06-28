import st from "bundle-text:../_CommonStyles/RippleAnimation.less";

export class RippleInitialiser {
   
  constructor(private element: HTMLElement) {
   element.addEventListener('click', this.createRipple.bind(this));
    let root = element.getRootNode() as HTMLElement;
  const style = document.createElement("style");
  style.textContent = st;
  root.prepend(style)
  }

    createRipple(event) {
        const button = this.element;

        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        console.log(diameter)
        const radius = diameter / 2;
      
        circle.setAttribute('part', 'ripple');
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
        console.log(button.offsetTop);
        circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
        circle.classList.add("ripple");
      
        const ripple = button.getElementsByClassName("ripple")[0];
      
        if (ripple) {
          ripple.remove();
        }
      
        button.appendChild(circle);
      }

      removeRipples = (el: HTMLElement) => {
          el.removeEventListener('click', this.createRipple.bind(this));
      }
}