import { customElement, html, LitElement, unsafeCSS } from "lit-element";
import { DockContainerService } from "./DockContainerService";

@customElement("juel-dock-container")
export class JuelDockContainer extends LitElement {

    go = false;
    service = new DockContainerService(this);

    firstUpdated() {
        setTimeout(() => {
            this.go = true;
        this.requestUpdate();
    });
    }

    updated() {
        if (this.go == true) {
        this.service.init();
        }
    }

    createRenderRoot() {
        return this;
    }

}