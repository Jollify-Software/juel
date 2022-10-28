import { noChange } from "lit";
import { Directive, directive, DirectiveParameters, ElementPart } from "lit-html/directive";

class WrapDirective extends Directive {
    update(part: ElementPart, [content, deep]: DirectiveParameters<this>) {
      let el = part.element;
      if (el) {
        if (deep) {
            $(el).find("*").wrap(content);
        } else {
            $(el).wrap(content);
        }
      }
      return this.render(content, deep);
    }
    render(content, deep) {
      return noChange;
    }
  }
export const wrap = directive(WrapDirective);