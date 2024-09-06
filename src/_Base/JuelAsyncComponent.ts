import { PropertyValueMap } from "lit";
import { JuelComponent } from "./JuelComponent";

export class JuelAsyncComponent extends JuelComponent {
    resolveReady: (unknown) => void;
    rejectReady: (unknown) => void;
    isReady = new Promise((resolve, reject) => {
        this.resolveReady = resolve;
        this.rejectReady = reject
    });

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.isReady.then(this.ready)
    }

    ready(value: any) {

    }
    
}