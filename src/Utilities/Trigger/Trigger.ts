import { customElement, property } from "lit/decorators";
import { CommandComponent } from "../../_Base/CommandComponent";
import { TriggerAction } from "./TriggerAction";
import bind from "bind-decorator";
import { TransitionModule } from "../../_Modules/TransistionModule";
import { Evaluate } from "../../_Utils/Evaluate";

@customElement("juel-trigger")
export class JuelTrigger extends CommandComponent {

    @property() event: string;
    @property() condition: string;
    @property() selector: string;
    @property() action: string;

    actions: TriggerAction[];

    element: HTMLElement;

    ready(): void {
        if (this.selector) {
            this.element = document.querySelector(this.selector);
        } else {
            this.element = this.parentElement;
        }
        if (this.event) {
            this.element.addEventListener(this.event, this.onEvent);
        }
        console.log(this.element)
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
        console.log(this.event);
        console.log(e);
        console.log(this.actions);
        if (this.actions) {
            for (let action of this.actions) {
                if (action.condition) {
                    let args: any = e;
                    if ('detail' in e && e.detail) {
                        args = e.detail;
                    }
                    if (Evaluate(action.condition, args)) {
                        this.performAction(action);
                    }
                } else {
                    this.performAction(action);
                }
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
            if (action.action && this.element) {
                    switch (action.action) {
                        case "addClass":
                            this.element.classList.add(action.arguments);
                            if (action.arguments.startsWith("transition")) {
                                TransitionModule.transitionElement(this.element);
                            }   
                        default:
                            if (action.action in this.element) {
                            // TODO: Call with parameters
                this.element[action.action]();
                            }
                    }
            }
        }
    }
}