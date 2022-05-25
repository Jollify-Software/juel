import { noChange } from "lit";
import { Directive, directive, DirectiveParameters, ElementPart } from "lit-html/directive";

class DataDirective extends Directive {
    update(part: ElementPart, [name, data]: DirectiveParameters<this>) {
      let el = part.element;
      if (el) {
          $(el).data(name, data);
      }
      return this.render(name, data);
    }
    render(name: string, data: object) {
      return noChange;
    }
  }
export const data = directive(DataDirective);