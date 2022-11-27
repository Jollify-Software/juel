import { html, LitElement, PropertyValueMap, TemplateResult, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Nav.less";
import { GetChildren } from "../_Utils/GetChildren";
import { JuelComponent } from "../_Base/JuelComponent";

@customElement("juel-nav")
export class JuelNav extends JuelComponent {

    static styles = unsafeCSS(Styles)

    @property({ type: Boolean })
    toggle: boolean = false;
    @property({ type: Boolean })
    sticky: boolean = false;
    @property({ type: String })
    side: string;
    @property({ type: String })
    push: string;
    @property({ type: Number })
    selected: number;

    itemsHtml: TemplateResult[];
    itemsWidth: string;

    constructor() {
      super();
      // Items to the right side of the title
      this.side = "right";
      this.sticky = false;
    }

    protected updated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
      super.updated(_changedProperties);
      setTimeout(() => {
        let h = $(this.shadowRoot.querySelector("nav")).outerHeight();
        this.style.setProperty("--height", `${h}px`);
      });
    }

    firstLoad() {
                if (this.sticky == true && !(<any>window).isMobile) {
// Get the offset position of the navbar
let nav = this.shadowRoot.querySelector('nav') as HTMLElement;
let title = nav.querySelector('.title') as HTMLElement;
let items = nav.querySelector('.items') as HTMLElement;
var navOffset = nav.offsetTop;
window.addEventListener('scroll', () => {
    if (window.pageYOffset >= navOffset + 10) {
        nav.classList.add("sticky");
        nav.setAttribute("part", "nav-sticky");
        title.setAttribute("part", "title-sticky");
        items.setAttribute("part", "items-sticky");
      } else {
        nav.classList.remove("sticky");
        nav.setAttribute("part", "nav");
        title.setAttribute("part", "title");
        items.setAttribute("part", "items");
      }
});
                }
    }

    toggleClick(e: Event) {
        e.stopImmediatePropagation();
        (<HTMLElement>e.target).classList.toggle("open");
        let el = this.shadowRoot.querySelector("nav");
        el.classList.toggle("open");
        if (el.classList.contains("open")) {
            if (this.push) {
                let css = {};
           //     css[`margin-${this.side}`] = this.itemsWidth;
                css["transition"] = "margin 2s";
                $(this.push).css(css);
            }
        } else {
            if (this.push) {
                let css = {};
         //       css[`margin-${this.side}`] = "0";
                $(this.push).css(css);
            }
        }
    }

    render() {
      let itemsClass = `items ${this.side}`;
        return html`<nav part="nav">
            <div part="title" class="title">
                <slot name="title">
                    <h1>${this.title}</h1>
                </slot>
            </div>
            <div part="items" class="${itemsClass}">
            <slot></slot>
            </div>
            </nav><div id="toggle" class="${this.toggle == true ? "shown" : ""}" @click="${this.toggleClick}">
            <span></span>
            <span></span>
            <span></span>
        </div>
        `;
    }
    
/* 1. Proloder 
$(window).on('load', function () {
    $('.loading').delay(450).fadeOut('slow');
    $('body').delay(450).css({
      'overflow': 'visible'
    });
  });

  var isIndex = false;
/* 2. sticky And Scroll UP 
if (location.pathname == "/_home-website/" || location.pathname == "/") {
isIndex = true;
$(".main-header .logo").hide();
}
  $(window).on('scroll', function () {
    var scroll = $(window).scrollTop();
    if (scroll < 400) {
      $(".header-sticky").removeClass("sticky-bar");
      $('#back-top').fadeOut(500);
      if (isIndex)
        $(".main-header .logo").hide();
    } else {
      $(".header-sticky").addClass("sticky-bar");
      $('#back-top').fadeIn(500);
      if (isIndex)
        $(".main-header .logo").show();
    }
  });

// Scroll Up
  $('#back-top a').on("click", function () {
    $('body,html').animate({
      scrollTop: 0
    }, 800);
    return false;
  });*/


}