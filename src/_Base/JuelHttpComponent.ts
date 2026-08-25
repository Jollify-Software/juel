import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";

export class JuelHttpComponent extends JuelComponent {

    @property({ type: String }) url: string;
    @property({ type: String }) list: string;
    @property({ type: String }) upload: string;

}
