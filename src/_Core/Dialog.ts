import { DragMoveListener, DragMoveListener2 } from "../_Utils/DragMoveListener";
import { IsMobile } from "../_Utils/IsMobile";
import { DialogManagerService } from "../DialogManager/DialogManagerService";
import { DialogOptions } from "./DialogOptions";

declare var interact: any;

export class Dialog {    

    title: string;
    element: HTMLElement;
    dialogManager: any;
    group: string[];
    modal: boolean;
    location: string;
    size: string;
    trigger: string;
    isOpen: boolean = false;

    private closeHandler: (this: HTMLElement, event: any) => any;

    constructor(private service: DialogManagerService, public id: string, options: DialogOptions) {
        
        this.title = options.title;
        this.location = options.location;
        this.size = options.size;
        this.trigger = options.trigger;
        this.group = options.group;
        this.modal = options.modal;
    }

    init(element: HTMLElement, dialogManager: any) {
        this.dialogManager = dialogManager;
        this.element = element;

        let closeBtnClick = () => {
            let closeEvt = new CustomEvent('close', { detail: this.element.id }); // TODO: DialogCloseArgs
            this.element.dispatchEvent(closeEvt);
            dialogManager.dispatchEvent(closeEvt);

            this.close();
        };

        console.log("Is Mobile + " + IsMobile());

        

        
        (<any>this.element).isInitialised = true;
    }

    show(resolve: (value?: unknown) => void) {
        this.element.style.display = "flex";
        this.isOpen = true;
        if (IsMobile()) {
            if (this.location && this.size) {
                switch (this.location) {
                    case 'top':
                        $(this.element).animate({
                            'top': 0
                        }, 'slow');
                        let openDialogs = this.service.dialogs.filter(x => x.id != this.id && x.isOpen)
                            .map(x => x.element);
                        if (openDialogs) {
                            $(openDialogs).animate({
                                'top': `${this.size}vh`,
                                'height': `${(100 - parseInt(this.size))}vh`
                            }, 'slow');
                        }
                        break;
                }
            }
        }

        this.closeHandler = (event: CustomEvent) => {
            if (IsMobile()) {
                if (this.location && this.size) {
                    switch (this.location) {
                        case 'top':
                            $(this.element).animate({
                                'top': `-${this.size}vh`
                            }, 'slow');
                            let openDialogs = this.service.dialogs.filter(x => x.id != this.id && x.isOpen)
                                .map(x => x.element);
                            if (openDialogs) {
                                $(openDialogs).animate({
                                    'top': `0`,
                                    'height': `100%`
                                }, 'slow');
                            }
                            break;
                    }
                } else {
                    this.element.style.top = '0';
                }
            }

            this.isOpen = false;
            this.element.style.display = "none";
            if (!this.service.dialogs.some(x => x.isOpen)) {
                this.element.parentElement.style.display = "none";
            }
            if (resolve) {
                resolve(event.detail);
            }
            let evt = new CustomEvent('closed', {
                detail: this.id
            });
            this.dialogManager.dispatchEvent(evt);
        };
        //$(this.element).off('close')
        //    .on('close', this.closeHandler);

    }

    /*
 
    export var toggleHeader = () => {
        return new Promise((resolve, reject) => {
            let animationDialog: JQuery<HTMLElement>;
            let styleDialog: JQuery<HTMLElement>;
            $('.ui-dialog').each((index, ele) => {
                let $this = $(ele);
                let titlebar = $(ele).find('.ui-dialog-titlebar');
                if (titlebar && titlebar.length > 0) {
                    styleDialog = $this;
                } else {
                    animationDialog = $this;
                }
            });
            let top = animationDialog.css("top");
            if (top != "0px" && !top.startsWith("-0")) {
                animationDialog.animate({
                    'top': 0
                }, 'slow', () => resolve());
                styleDialog.animate({
                    'top': '20vh',
                    'height': '80vh'
                }, 'slow');
            } else {
                animationDialog.animate({
                    'top': '-20vh'
                }, 'slow', () => resolve());
                styleDialog.animate({
                    'top': 0,
                    'height': '100vh'
                }, 'slow');
            }
        });
    }
    */

    close(value: any = null) {
        if (this.element) {

            if (window['isMobile']) {
                if (this.location && this.size) {
                    switch (this.location) {
                        case 'top':
                            $(this.element).animate({
                                'top': `calc(var(--vh) * ${this.size})`
                            }, 'slow');
                            let openDialogs = this.service.dialogs.filter(x => x.id != this.id && x.isOpen)
                                .map(x => x.element);
                            if (openDialogs) {
                                $(openDialogs).animate({
                                    'top': `calc(var(--vh) * ${this.size})`,
                                    'height': '100%'
                                }, 'slow');
                            }
                            break;
                    }
                } else {
                    this.element.style.display = "none";
                }
            }

            let closeEvt = new CustomEvent('close', { detail: this.id }); // TODO: DialogCloseArgs
            this.element.dispatchEvent(closeEvt);
            this.element.removeEventListener('close', this.closeHandler);
        }
    }

    dispose() {
    }

}