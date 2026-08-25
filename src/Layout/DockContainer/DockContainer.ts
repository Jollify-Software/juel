import { property, customElement } from "lit/decorators";
import { JuelComponent } from "../../_Base/JuelComponent";
import { DockContainerService } from "./DockContainerService";

@customElement("juel-dock-container")
export class JuelDockContainer extends JuelComponent {

    @property() handle: string;

    go = false;
    service = new DockContainerService(this);

    firstLoad(): void {
        this.go = true;
        this.requestUpdate();        
    }

    load() {
        if (this.go == true) {
        this.service.init();
        }
    }

    createRenderRoot() {
        return this;
    }

}