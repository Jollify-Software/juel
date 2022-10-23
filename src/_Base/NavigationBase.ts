import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";

export class NavigationBase extends JuelComponent {
    
    @property() position: number;
    
    firstLoad(): void {
        if (window.location.hash) {
            this.navigateToSelector(window.location.hash);
        }
    }

    navigateTo(index: number) {
        
    }

    navigateToSelector(selector: string) {

    }
}