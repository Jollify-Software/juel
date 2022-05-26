import { noChange } from "lit";
import { Directive, directive, DirectiveParameters, ElementPart } from "lit-html/directive";

class AttrDirective extends Directive {
    update(part: ElementPart, [name, value]: DirectiveParameters<this>) {
      let el = part.element;
      if (el) {
          el.setAttribute(name, value);
      }
      return this.render(name, value);
    }
    render(name: string, value: string) {
      return noChange;
    }
  }
export const attr = directive(AttrDirective);