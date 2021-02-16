import { Dialog } from "../_Core/Dialog";
import { JuelDialogManager } from "./DialogManager";

export class DialogManagerService {

    dialogs: Dialog[] = [];
    container: HTMLElement

    constructor(private element: JuelDialogManager) {

    }

    init() {
        this.container = this.element.shadowRoot.getElementById("container");
        this.container.style.display = "none";

        for (let dialog of this.dialogs) {
            let div = this.container.querySelector(`#${dialog.id}`) as HTMLElement;
            dialog.init(div);
        }
        window['juel']['dialogManager'] = this;
    }

    showDialog(id: string) {
        // TODO: Return promise?
        return new Promise(resolve => {
            let dialog = this.dialogs.find(x => x.id == id);
            if (dialog) {
                let toClose = this.dialogs.filter(x => x.id != id &&
                    ((!dialog.group) || (x.group && dialog.group.some(grp => x.group.indexOf(grp) < 0))))
                for (let close of toClose) {
                    console.log("Not supposed to close")
                    close.close();
                }
                if (dialog.modal) {
                    this.container.classList.add("modal");
                } else {
                    this.container.classList.remove("modal");
                }
                this.container.style.display = "flex";
                dialog.show(resolve);
            }
        });
    }

    close(id: string, value: any) {
        let dialog = this.dialogs.find(x => x.id == id);
            if (dialog) {
                dialog.close(value);
            }
    }

}