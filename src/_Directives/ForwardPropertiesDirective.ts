import { directive, Directive, PartInfo, PartType } from 'lit/directive.js';
import { ElementPart } from 'lit';

type ForwardCustomPropsOptions = {
  prefix?: string;
  keys?: string[];
};

class ForwardPropertiesDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('forwardCustomProps can only be used on elements');
    }
  }

  render(_targetOrOptions?: HTMLElement | ForwardCustomPropsOptions, _options?: ForwardCustomPropsOptions) {
    return;
  }

  update(part: ElementPart, args: [HTMLElement | ForwardCustomPropsOptions, ForwardCustomPropsOptions?]) {
    const fromEl = part.element as HTMLElement;

    // Detect if the first arg is the target or options
    let target: HTMLElement = fromEl;
    let options: ForwardCustomPropsOptions = {};

    if (args[0] instanceof HTMLElement) {
      target = args[0];
      options = args[1] ?? {};
    } else if (args[0]) {
      options = args[0];
    }

    const { prefix, keys } = options;
    const computedStyles = getComputedStyle(fromEl);

    const prefixStr = prefix ? `--${prefix}` : '--';
    const allowAll = !prefix && !keys;

    for (let i = 0; i < computedStyles.length; i++) {
      const prop = computedStyles[i];
      const shouldInclude =
        allowAll ||
        (prefix && prop.startsWith(prefixStr)) ||
        (keys && keys.includes(prop));

      if (shouldInclude) {
        const value = computedStyles.getPropertyValue(prop);
        target.style.setProperty(prop, value);
      }
    }

    return;
  }
}
export const forwardProperties = directive(ForwardPropertiesDirective);