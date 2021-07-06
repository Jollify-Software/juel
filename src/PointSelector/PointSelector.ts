import bind from "bind-decorator";
import { customElement, html, LitElement, property } from "lit-element";
import { Point } from "../_Core/Point";

@customElement("juel-point-selector")
export class JuelPointSelector extends LitElement {
    @property() element: string
    @property() text: string;

    isSelecting: boolean;
    point: Point;
    pointMarker: HTMLElement;

    firstUpdated() {
        if (!this.element) {
            this.element = 'body';
        }
        if (!this.text) {
            this.text = 'Select a point';
        }
        this.pointMarker = document.body.querySelector('#point-marker');
        if (!this.pointMarker) {
            this.pointMarker = document.createElement('div');
            this.pointMarker.id = 'point-marker';
            this.pointMarker.style.display = 'none';
            this.pointMarker.style.position = 'absolute';
            this.pointMarker.style.backgroundImage = 'var(--icon-crosshair)';
            this.pointMarker.style.width = "50px";
            this.pointMarker.style.height = "50px";
            document.body.append(this.pointMarker);
    //        el.addEventListener('mousemove', this.mouseMove)
        }
    }

    @bind
    buttonClick(e: CustomEvent) {
        this.isSelecting = true;
        this.pointMarker.style.display = 'inline-block';
        let d = e.detail as MouseEvent;
        this.pointMarker.style.left = `${(d.clientX - 25)}px`;
        this.pointMarker.style.top = `${(d.clientY - 25)}px`;
        document.body.addEventListener('mousemove', this.mouseMove);
        document.body.addEventListener('mousedown', this.mouseDown);
    }

    @bind
    mouseMove(e: MouseEvent) {
        if (this.isSelecting) {
            this.point = {
                x: e.clientX,
                y: e.clientY
            };
            this.pointMarker.style.left = `${(this.point.x - 25)}px`;
            this.pointMarker.style.top = `${(this.point.y - 25)}px`;
        }
    }

    @bind
    mouseDown() {
        this.isSelecting = false;
        this.pointMarker.style.display = 'none';
        document.body.removeEventListener('mousemove', this.mouseMove);
        document.body.removeEventListener('mousedown', this.mouseDown);
        let event = new CustomEvent('point_selected', {
            detail: this.point
        });
    }

    render() {
        return html`
            <juel-button text="${this.text}" @ButtonClick="${this.buttonClick}">
                <slot><slot>
            </juel-button>
        `;
    }

}