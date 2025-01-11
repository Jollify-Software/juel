import { ListBase } from "./ListBase";

export class NavigationBase extends ListBase {
    
    ready(): void {
        super.ready();
        if (window.location.hash) {
            this.navigateToSelector(window.location.hash);
        }
    }

    navigateTo(index: number) {
        
    }

    navigateToSelector(selector: string) {

    }
}