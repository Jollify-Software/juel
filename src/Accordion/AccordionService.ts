import { JuelAccordion } from "./Accordion";

export class AccordionService {

  constructor(private element: JuelAccordion) {

  }

  init() {
    let h: number = 0;
    let btns = $(this.element.shadowRoot).find('.title');
    btns.each((index, el) => {
      el.addEventListener("click", function () {
        /* Toggle between adding and removing the "active" class,
        to highlight the button that controls the panel */
        el.classList.toggle("active");
        if (el.classList.contains("active")) {
          $(el).siblings(".title").removeClass("active");
        }
      });
    });
  }
}