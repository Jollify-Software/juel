import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";
import { JuelContainerComponent } from "./JuelContainerComponent";

export class NavigationBase extends JuelContainerComponent {
    
    firstLoad(): void {
        super.firstLoad();
        if (window.location.hash) {
            this.navigateToSelector(window.location.hash);
        }
    }

    navigateTo(index: number) {
        
    }

    navigateToSelector(selector: string) {

    }
}