import { LitElement } from "lit";

export class CommandBase extends LitElement {
    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }
}