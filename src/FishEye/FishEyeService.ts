import { FishEye } from "./FishEye";

const caption_class = ".caption";

export class FishEyeService {

    ele: FishEye

    constructor(ele: FishEye) {
        this.ele = ele;
    }

    close(ele: JQuery<HTMLElement>) {
        let w = this.ele.closeWidth;
        let h = this.ele.closeHeight;
        /*
        ele.stop().animate({
            width : w,
            height : h,
            left : 0,
            top : 0,
            marginLeft : 0,
            marginTop : 0
        }, "fast");
        */
       if (ele[0]) {
       ele[0].style.transform = "scale(1)";
       }
        ele.removeClass("open");
        ele.children(caption_class).css({
            display : "none"
        });
    }

    open(ele: JQuery<HTMLElement>, scale: number, displayCaption?: boolean) {
        let w = this.ele.openWidth;
        let h = this.ele.openHeight;
        /*
        ele.stop().animate({
            width : w * scale,
            height : h * scale,
            marginTop : -((h / 2) * scale)
        }, "fast");
        */
       let caption = ele.children(caption_class);
       if (ele[0] && displayCaption && caption.length > 0) {
       ele[0].style.transform = `scale(${scale}) translate(0, -${caption.height() / 2}px)`;
       } else if (ele[0]) {
        ele[0].style.transform = `scale(${scale})`;
       }
        if(scale >= 1) {
            ele.addClass("open");
            if (displayCaption) {
            ele.children(caption_class).css({
                display : "block",
                top : -((h * scale) / 2)
            });
        }
        } else {
            ele.addClass("lui-fisheye-part");
        }
    }

    init() {
        $(this.ele).children().each((index, element) => {
            let $this = $(element);
			var title = $this.find(caption_class);
            let w = this.ele.style.getPropertyValue("--closeWidth");
            let h = this.ele.style.getPropertyValue("--closeHeight");

			title.css({
                display : "none"
				//position : "absolute"

            });
            /*
			$this.css({
				width : w,
				height : h,
				position : "relative"
            });
            */

			$this.hover(() => {
				this.open($this.prev(), 2);
				this.open($this, 3, true);
				this.open($this.next(), 2);
			}, () => {
				this.close($this.prev());
				this.close($this);
				this.close($this.next());
			})
        })
    }
}