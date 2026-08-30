import { customElement, property } from "lit/decorators";
import { CommandComponent } from "../../_Base/CommandComponent";
import { TriggerAction } from "./TriggerAction";
import bind from "bind-decorator";
import { Evaluate } from "../../_Utils/Evaluate";

@customElement("juel-trigger")
export class JuelTrigger extends CommandComponent {

    @property() event: string;
    @property() condition: string;
    @property() selector: string;
    @property() action: string;

    actions: TriggerAction[];

    element: HTMLElement;

    private hasReadied = false;
    // The element the listener is attached to. Tracked separately from
    // `this.element` because performAction() reassigns that to an action target.
    private boundTarget: HTMLElement;

    ready(): void {
        this.hasReadied = true;
        if (this.selector) {
            this.element = document.querySelector(this.selector);
        } else {
            this.element = this.parentElement;
        }
        this.bindEvent();
    }

    connectedCallback(): void {
        super.connectedCallback();
        // A host may move this element in the DOM (e.g. wrapping a parent's
        // children in a container). That fires disconnectedCallback, which
        // tears the listener down, but ready() only runs once — so re-bind
        // on every reconnect after the first ready().
        if (this.hasReadied) {
            this.bindEvent();
        }
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.unbindEvent();
    }

    private bindEvent(): void {
        this.unbindEvent();
        let target = this.selector
            ? document.querySelector<HTMLElement>(this.selector)
            : this.parentElement;
        if (target && this.event) {
            target.addEventListener(this.event, this.onEvent);
            this.boundTarget = target;
        }
    }

    private unbindEvent(): void {
        if (this.boundTarget && this.event) {
            this.boundTarget.removeEventListener(this.event, this.onEvent);
            this.boundTarget = null;
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
                            break;
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