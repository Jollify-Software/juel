export class AccordionService {
    init(container: HTMLElement) {
        let btns = container.querySelectorAll('.title');
        for (let i = 0; i < btns.length; i++) {
            btns[i].addEventListener("click", function() {
              /* Toggle between adding and removing the "active" class,
              to highlight the button that controls the panel */
              this.classList.toggle("active");
          
              /* Toggle between hiding and showing the active panel */
              var panel = this.nextElementSibling as HTMLElement;
              if (panel.style.display === "block") {
                panel.style.display = "none";
              } else {
                panel.style.display = "block";
              }
              if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
              } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
              } 
            });
          }
    }
}