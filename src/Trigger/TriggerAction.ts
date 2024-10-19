import { customElement, property } from "lit/decorators";
import { CommandBase } from "../_Base/CommandBase";
import { PropertyValues } from "lit";
import { JuelTrigger } from "./Trigger";

@customElement("juel-trigger-action")
export class JuelTriggerAction extends CommandBase {
    @property() selector: string;
    @property() condition: string;
    @property() action: string;
    @property() arguments: string;

    protected updated(_changedProperties: PropertyValues): void {
        let action: TriggerAction = {
            selector: this.selector,
            condition: this.condition,
            action: this.action,
            arguments: this.arguments
        };
        let trigger = this.parentElement as JuelTrigger;
        trigger.addAction(action);
    }
}
export interface TriggerAction {
    selector: string;
    condition: string;
    action: string;
    arguments: string;
}