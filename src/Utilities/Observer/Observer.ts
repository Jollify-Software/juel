import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators";
import { ObserverEvents } from "./ObserverEvents";

// A declarative IntersectionObserver — wrap anything in <juel-observer> and
// it toggles a class (in-view-class, default "in-view") on itself, plus
// dispatches observer-enter/observer-leave, whenever it crosses the given
// threshold. It has no opinion on what "in view" should look like — write
// CSS keyed off the class for a pure-CSS reveal, or wire a <juel-trigger>
// to observer-enter/observer-leave to drive anything else (play a
// juel-animate, show a toast, whatever) without writing any JS at all.
@customElement("juel-observer")
export class JuelObserver extends LitElement {

    static styles = css`
        :host {
            display: block;
        }
    `;

    @property({ type: Number }) threshold: number = 0;
    @property({ attribute: "root-margin" }) rootMargin: string = "0px";
    @property({ attribute: "in-view-class" }) inViewClass: string = "in-view";
    @property({ type: Boolean }) once: boolean = false;

    private observer: IntersectionObserver | null = null;

    connectedCallback(): void {
        super.connectedCallback();
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersect(entries),
            { threshold: this.threshold, rootMargin: this.rootMargin }
        );
        this.observer.observe(this);
    }

    disconnectedCallback(): void {
        this.observer?.disconnect();
        this.observer = null;
        super.disconnectedCallback();
    }

    private handleIntersect(entries: IntersectionObserverEntry[]): void {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                this.classList.add(this.inViewClass);
                this.dispatchEvent(new CustomEvent(ObserverEvents.Enter, {
                    detail: { ratio: entry.intersectionRatio },
                    bubbles: true,
                    composed: true,
                }));
                if (this.once) {
                    this.observer?.disconnect();
                }
            } else if (!this.once) {
                this.classList.remove(this.inViewClass);
                this.dispatchEvent(new CustomEvent(ObserverEvents.Leave, {
                    detail: { ratio: entry.intersectionRatio },
                    bubbles: true,
                    composed: true,
                }));
            }
        }
    }

    render() {
        return html`<slot></slot>`;
    }
}
