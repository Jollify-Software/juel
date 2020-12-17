import { Dialog } from "../_Core/Dialog";

export class DialogManagerService {

    dialogs: Dialog[] = [];
    container: HTMLElement

    init(container: HTMLElement) {
        this.container = container;
        this.container.style.display = "none";

        for (let dialog of this.dialogs) {
            let div = container.querySelector(`#${dialog.id}`) as HTMLElement;
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