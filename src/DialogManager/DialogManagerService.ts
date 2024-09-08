import { Dialog } from "../_Core/Dialog";
import { JuelDialogManager } from "./DialogManager";

export class DialogManagerService {

    dialogs: Dialog[] = [];

    constructor(private element: JuelDialogManager) {

    }

    showDialog(id: string) {
        // TODO: Return promise?
        return new Promise(resolve => {
            let dialog = this.dialogs.find(x => x.id == id);
            console.log(dialog)
            if (dialog) {
                let toClose = this.dialogs.filter(x => x.id != id &&
                    ((!dialog.group) || (x.group && dialog.group.some(grp => x.group.indexOf(grp) < 0))))
                for (let close of toClose) {
                    console.log("Not supposed to close")
                    close.close();
                }
                if (dialog.modal) {
                    this.element.container.classList.add("modal");
                } else {
                    this.element.container.classList.remove("modal");
                }
                this.element.container.style.display = "flex";
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