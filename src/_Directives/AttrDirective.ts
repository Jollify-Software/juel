import { noChange } from "lit";
import { Directive, directive, DirectiveParameters, ElementPart } from "lit-html/directive";

class AttrDirective extends Directive {
  update(part: ElementPart, [name, value]: DirectiveParameters<this>) {
    let el = part.element;
    if (el && typeof value === 'string') {
      el.setAttribute(name, value);
    } else if (el && value instanceof HTMLElement) {
      let attrs = [...value.attributes]
        .filter(a => a.name.startsWith(name));
      // Map them into an object
      let map = attrs.reduce((prev, current) => {
        prev[current.name] = current.value;
        return prev;
      }, {});
      if (attrs && !$.isEmptyObject(map)) {
        // Remove all the attributes
        attrs.forEach(at => value.removeAttribute(at.name));
        $(el).attr(map);
      }
    }
    return this.render(name, value);
  }
  render(name: string, value: string | HTMLElement) {
    return noChange;
  }
}
export const attr = directive(AttrDirective);