import { html, LitElement, TemplateResult, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from "bundle-text:./Nav.less";
import { GetChildren } from "../_Utils/GetChildren";

@customElement("juel-nav")
export class JuelNav extends LitElement {

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

    firstUpdated() {
        setTimeout(() => {
            this.requestUpdate();
            setTimeout(() => {
                if (this.sticky == true && !(<any>window).isMobile) {
// Get the offset position of the navbar
let nav = this.shadowRoot.querySelector('nav') as HTMLElement;
let title = nav.querySelector('.title') as HTMLElement;
var navOffset = nav.offsetTop;
window.addEventListener('scroll', () => {
    if (window.pageYOffset >= navOffset + 10) {
        nav.classList.add("sticky");
        title.setAttribute("part", "title-sticky");
      } else {
        nav.classList.remove("sticky");
        title.setAttribute("part", "title");
      }
});
                }
            });

            /*
            this.itemsWidth = this.style.getPropertyValue("--items-width");
            if (!this.itemsWidth) {
                let w: number = 0;
                $(this.shadowRoot).find('.item').each((index, el) => {
                    w += $(el).outerWidth();
                })
                this.itemsWidth = `${w}px`;
                this.style.setProperty("--items-width", this.itemsWidth);
            }
            this.shadowRoot.getElementById("items").style.width = '0';
            this.shadowRoot.getElementById("items").style.visibility = 'visible';
            */
        });
    }

    toggleClick(e: Event) {
        e.stopImmediatePropagation();
        let el = this.shadowRoot.getElementById("nav");
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
        return html`
            <nav id="nav">
            <div part="title" class="title">
                <slot name="title">
                    <h1>${this.title}</h1>
                </slot>
                <div id="toggle" class="${this.toggle == true ? "shown" : ""}" @click="${this.toggleClick}">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div id="items" part="items" class="${this.side ? `side ${this.side}` : ""}">
            ${ChildrenMap(this, (el, index) => {
                if (el.getAttribute("slot") != "title") {
                let id = el.id ? el.id :  `item-${index}`;
                el.setAttribute('slot', id);

                let klass = 'item';
                if(this.selected && this.selected == index) {
                    klass += " selected";
                }

                return html`
                    <div class="${klass}" data-index="${index}">
                    <slot name="${id}"></slot>
                    </div>`;
            } else {
                return html``;
            }
            }, '[slot="title"],[slot="addon"]')}
            </div>
            <div class="addon">
            <slot name="addon"></slot>
            </div>
            </nav>
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