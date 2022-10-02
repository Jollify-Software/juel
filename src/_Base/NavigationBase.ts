import { JuelComponent } from "./JuelComponent";

export class NavigationBase extends JuelComponent {
    
    firstLoad(): void {
        if (window.location.hash) {
            this.navigateToSelector(window.location.hash);
        }
    }

    navigateToSelector(selector: string) {

    }
}