import { createPopper, Instance } from "@popperjs/core";
import { generateGetBoundingClientRect, virtualElement } from "../_Core/VirtualElement";
import { Point } from "../_Core/Point";

export class PopupServiceBase {
  config: any = {
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [10, 20],
        },
      },
    ],
  };
  vElement = virtualElement;
  instance: Instance;
  element: HTMLElement;
  timeout;

  createPopup(target: HTMLElement | string | MouseEvent | Point, timeout: boolean = false) {
    if (!this.instance) {
      document.body.append(this.element);
      if (target instanceof String) {
        let el = document.querySelector(target as string);
        this.instance = createPopper(el, this.element);
      } else if ('nodeName' in (<object>target)) {

      } else if ('x' in (<object>target)) {
        let e = <MouseEvent>target;
        this.vElement.getBoundingClientRect = generateGetBoundingClientRect(e.x, e.y);
        this.instance = createPopper(this.vElement, this.element, this.config);
      }
      if (timeout) {
        this.timeout = setTimeout(() => {
          this.closePopup();
        }, 400);
      }
    } else { // Tooltip does already exist
      if ('x' in (<object>target)) {
        let e = <MouseEvent>target;
        this.vElement.getBoundingClientRect = generateGetBoundingClientRect(e.x, e.y);
        this.instance.update();
      }
    }
  }

  closePopup() {
    this.instance.destroy();
    this.instance = null;
    this.element.remove();
    this.element = null;
  }

}