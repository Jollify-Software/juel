import { customElement, property } from "lit/decorators";
import { CommandComponent } from "../_Base/CommandComponent";
import { TriggerAction } from "./TriggerAction";
import bind from "bind-decorator";

@customElement("juel-trigger")
export class JuelTrigger extends CommandComponent {

    @property() event: string;
    @property() condition: string;
    @property() selector: string;
    @property() action: string;

    actions: TriggerAction[];

    element: HTMLElement;

    firstLoad(): void {
        if (this.selector) {
            this.element = document.querySelector(this.selector);
        } else {
            this.element = this.parentElement;
        }
        if (this.event) {
            this.element.addEventListener(this.event, this.onEvent);
        }
    }

    disconnectedCallback(): void {
        if (this.element) {
            this.element.removeEventListener(this.event, this.onEvent);
        }
    }

    addAction(action: TriggerAction) {
        if (!this.actions) {
            this.actions = [];
        }
        this.actions.push(action);
    }

    @bind
    onEvent(e: Event) {
        if (this.actions) {
            for (let action of this.actions) {
                this.performAction(action);
            }
        } else {
            this.performAction();
        }
    }

    performAction(action: TriggerAction = null) {
        console.log(action);
        if (!action) {
            if (this.action && this.element &&
                this.action in this.element) {
                // TODO: Call with parameters
                this.element[this.action]();
            }
        } else {
            if (action.selector) {
                this.element = document.querySelector(action.selector);
            }
            if (action.action && this.element &&
                action.action in this.element) {
                // TODO: Call with parameters
                this.element[action.action]();
            }
        }
    }
}