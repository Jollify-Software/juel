import { html, LitElement } from "lit";
import { property, customElement, queryAssignedElements } from "lit/decorators";
import { DragMoveListener } from "../../_Utils/DragMoveListener";
import { emojiRegex } from "../../_Utils/EmojiRegex";
import interact from '@interactjs/interactjs';
import { JuelComponent } from "../../_Base/JuelComponent";
import { applyInteract } from "../../_Utils/dom/ApplyInteract";

@customElement("juel-draggable")
export class JuelDraggable extends JuelComponent {

    @queryAssignedElements()
    elements: HTMLElement[];

    constructor() {
        super();
        if (!('interact' in window)) {
            window['interact'] = interact;
            }
    }

    slotChange(e) {
        /*
        let html = this.innerHTML as any;
        html = html.replaceAll(emojiRegex, '<div>$1</div>');
        this.innerHTML = html;
        */
        applyInteract(this.elements, (element) => {
                element.draggable({
                    listeners: {
                        // call this function on every dragmove event
                        move: DragMoveListener
                    }
                })
            });
    }
    
    render() {
        return html`<div>
            <slot @slotchange="${this.slotChange}"></slot>
        <div>`;
    }
}