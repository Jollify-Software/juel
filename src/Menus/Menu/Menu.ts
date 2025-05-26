import { html, css, LitElement } from "lit";
import { customElement, query } from "lit/decorators.js";
import { CollapsibleBase } from "../../_Base/CollapsibleBase";

@customElement('juel-menu')
export class JuelMenu extends CollapsibleBase {
  @query('[part="trigger"]')
  private triggerElement!: HTMLElement;

  @query('[part="content"]')
  private contentElement!: HTMLElement;

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    [part="trigger"] {
    display: inline-block;
      cursor: pointer;
    }

    [part="content"] {
      transition: max-height 0.3s ease, visibility 0.3s ease;
      max-height: 0;
      visibility: hidden;
      position: absolute;
      z-index: 100;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    :host([collapse-mode="push"]) [part="content"] {
      position: static;
      box-shadow: none;
    }
  `;

  getTriggerElement(): HTMLElement {
    return this.triggerElement;
  }

  getCollapseElement(): HTMLElement {
    return this.contentElement;
  }

  render() {
    return html`
      <div part="trigger">
        <slot name="trigger"></slot>
      </div>
      <div part="content">
        <slot></slot>
      </div>
    `;
  }
}