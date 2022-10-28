import { noChange } from "lit";
import { Directive, directive, DirectiveParameters, ElementPart } from "lit-html/directive";

function wrap(el: JQuery<HTMLElement>, term: string, content) {
    el.contents()
        .filter((index, node) => node.nodeType == 3 && node.textContent.includes(term))
        .each((index, node) => {
          var nel = $("<span>");
          var i = node.textContent.indexOf(term);
          var before = node.textContent.substring(0, i);
          var after = node.textContent.substring(i + term.length);
          nel.append(before);
          var termEl = $(content);
          termEl.append(term);
          nel.append(termEl);
          nel.append(after);
          var parent = $(node.parentElement);
          parent.html(nel[0]);
        });
}

class WrapTextDirective extends Directive {
    update(part: ElementPart, [term, content, deep]: DirectiveParameters<this>) {
      let el = part.element;
      if (el) {
        if (deep) {
            wrap($(el).find("*"), term, content);
        } else {
            wrap($(el) as JQuery<HTMLElement>, term, content);
        }
      }
      return this.render(term, content, deep);
    }
    render(term, content, deep) {
      return noChange;
    }
  }
export const wrapText = directive(WrapTextDirective);