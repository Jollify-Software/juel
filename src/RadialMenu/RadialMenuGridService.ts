import { RadialMenu } from "./RadialMenu";

export class RadialMenuGridService {
    ele: RadialMenu;

    constructor(ele: RadialMenu) {
        this.ele = ele;
    }

    init() {

        console.log(this.ele)
            let container = $(this.ele);
            let btn = $(this.ele.shadowRoot.querySelector('div.button') as HTMLElement);
            let menu = container.children('[slot="items"]');
            
            console.log(btn[0])

            let menuChildCount = menu.children().length;
            let colCount = (menuChildCount / 2);
            let cellCount = colCount * colCount;
            menu[0].style.setProperty("--colCount", colCount as unknown as string);
            menu[0].style.setProperty("--rowCount", colCount as unknown as string);
             
            btn.click(function() {
              if (container.hasClass("open")) {
                menu[0].style.transform="scale(0)"; 
                btn[0].style.transform="rotate(0deg)";
                container.removeClass("open");
              } else {
                menu[0].style.transform="scale(3)"; 
                btn[0].style.transform="rotate(45deg)"; 
                container.addClass("open");
              }
            });
    }
}