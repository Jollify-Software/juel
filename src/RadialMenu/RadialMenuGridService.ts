import { RadialMenu } from "./RadialMenu";

export class RadialMenuGridService {
  toggle: Function;
  ele: RadialMenu;

  constructor(ele: RadialMenu) {
    this.ele = ele;
  }

  init() {
    let container = $(this.ele.shadowRoot.querySelector('.menu'));
    let btn = $(this.ele.shadowRoot.querySelector('div.button') as HTMLElement);
    let menu = container.children('#items') as JQuery<HTMLElement>;

    let menuChildCount = menu.children().length;
    let colCount = (menuChildCount / 2);
    let cellCount = colCount * colCount;
    menu[0].style.setProperty("--colCount", colCount as unknown as string);
    menu[0].style.setProperty("--rowCount", colCount as unknown as string);

    this.toggle = () => {
      if (container.hasClass("open")) {
        menu[0].style.transform = "scale(0.1)";
        btn[0].style.transform = "rotate(0deg)";
        container.removeClass("open");
        let e = new CustomEvent("menu-close");
        this.ele.dispatchEvent(e)
      } else {
        menu[0].style.transform = "scale(3)";
        btn[0].style.transform = "rotate(45deg)";
        container.addClass("open");
        let e = new CustomEvent("menu-open");
        this.ele.dispatchEvent(e)
      }
    }

    btn.click(() => this.toggle());
  }
}