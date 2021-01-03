import { DragMoveListener } from "../_Utils/DragMoveListener";
import { DialogManagerService } from "../DialogManager/DialogManagerService";
import { IsMobile } from "../_Utils/IsMobile";

declare var interact: any;

export class Dialog {    

    title: string;
    element: HTMLElement;
    group: string[];
    modal: boolean;
    location: string;
    size: string;
    trigger: string;
    isOpen: boolean = false;

    private closeHandler: (this: HTMLElement, event: any) => any;

    constructor(private service: DialogManagerService, public id: string, dataset: DOMStringMap) {
        
        this.title = dataset.title;
        this.location = dataset.location;
        this.size = dataset.size;
        this.trigger = dataset.trigger;
        this.group = dataset.group ? dataset.group.split(' ') : undefined;
        this.modal = dataset.modal ? dataset.modal.toLowerCase() == "true" : undefined;
    }

    init(element: HTMLElement) {
        this.element = element;
        this.element.style.display = "none";

        let closeBtnClick = () => {
            let closeEvt = new CustomEvent('close');
            console.log("Close Click!!");
            this.element.dispatchEvent(closeEvt);
        };
        let closeBtn = this.element.querySelector(".close");
        $(closeBtn).off('click');
        closeBtn.addEventListener('click', closeBtnClick);


        if (!IsMobile()) {

            // target elements with the "draggable" class
            interact(this.element)
                .draggable({
                    // enable inertial throwing
                    inertia: true,
                    allowFrom: ".titlebar",
                    
                    modifiers: [
                        interact.modifiers.restrict({
                          restriction: 'parent',
                        })
                    ],

                    listeners: {
                        // call this function on every dragmove event
                        move: DragMoveListener,

                        // call this function on every dragend event
                        end(event) {
                            /* TODO:
                        if (storageKeyX) {
                            localStorage.setItem(storageKeyX, e.clientX.toString());
                        }
                        if (storageKeyY) {
                            localStorage.setItem(storageKeyY, e.clientY.toString());
                        }
                        */
                        }
                    }
                })
        } else { // Is mobile
            if (this.location && this.size) {
                switch (this.location) {
                    case 'top':
                        this.element.style.top = `calc(var(--vh) * -${this.size})`;
                        this.element.style.height = `calc(var(--vh) * ${this.size})`;
                        break;
                }
            }
        }


        if (this.trigger) {
            let trigger = document.querySelector(this.trigger);
            if (trigger) {
                trigger.addEventListener('click', () => {
                    this.service.showDialog(this.id);
                })
            }
        }
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
            console.log("Clsoe!!!")
            document.querySelector('juel-dialog-manager').dispatchEvent(evt);
        };
        $(this.element).off('close')
            .on('close', this.closeHandler);

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
                }
            }

            let closeEvt = new CustomEvent('close', { detail: value });
            this.element.dispatchEvent(closeEvt);
            this.element.removeEventListener('close', this.closeHandler);
        }
    }

    dispose() {
    }

}