import { html, PropertyValues, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { JuelComponent } from "../../_Base/JuelComponent";
import Styles from "bundle-text:./Modal.less";
import "../../Buttons/Button/Button";

/** Detail of `modal-closed`: what the modal was closed with — `close(value)`'s value, or '' when dismissed. */
export interface ModalClosedDetail {
    returnValue: string;
}

/**
 * A modal dialog on the native `<dialog>` element (top layer, focus trap,
 * inert page behind it). `open()` shows it; `close(value?)` closes it, and
 * `modal-closed` reports the value. Escape, the close button and a click
 * on the backdrop dismiss it (value '') unless `dismissible` is false;
 * a dismissal fires a cancelable `modal-cancel` first.
 *
 * Slots: `title` (or the `label` attribute), the default slot for the
 * body, and `buttons` for a right-aligned footer. On open, focus goes to
 * the first slotted element with `autofocus` (or inside one), else the
 * first focusable one.
 *
 * Content is slotted, so a `<form>` inside it is the caller's own: handle
 * its submit and call `close(value)`.
 */
@customElement("juel-modal")
export class JuelModal extends JuelComponent {

    static styles = unsafeCSS(Styles);

    /** A selector for elements that open this modal when clicked. */
    @property() trigger: string;
    /** The title, when nothing is slotted into `title`. */
    @property() label: string;
    @property({ type: Boolean }) dismissible: boolean = true;
    /** Reflects whether the modal is showing. */
    @property({ type: Boolean, reflect: true }) opened: boolean = false;

    @query("dialog") private dialog!: HTMLDialogElement;
    @state() private hasButtons = false;
    private returnValue = '';
    private triggers: Element[] = [];

    connectedCallback(): void {
        super.connectedCallback();
        this.ripple = false;
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.unbindTriggers();
    }

    protected updated(changed: PropertyValues): void {
        super.updated(changed);
        if (changed.has('trigger')) this.bindTriggers();
    }

    private openFromTrigger = () => this.open();

    private bindTriggers() {
        this.unbindTriggers();
        if (!this.trigger) return;
        this.triggers = Array.from(document.querySelectorAll(this.trigger));
        this.triggers.forEach(el => el.addEventListener('click', this.openFromTrigger));
    }

    private unbindTriggers() {
        this.triggers.forEach(el => el.removeEventListener('click', this.openFromTrigger));
        this.triggers = [];
    }

    /** Show the modal. Resolves once it's open and focus has moved into it. */
    async open(): Promise<void> {
        await this.updateComplete;
        if (this.dialog.open) return;
        this.returnValue = '';
        this.dialog.showModal();
        this.opened = true;
        this.focusInitial();
        this.dispatchEvent(new CustomEvent('modal-opened', { bubbles: true, composed: true }));
    }

    /** Close the modal; `modal-closed` reports `returnValue`. */
    close(returnValue = ''): void {
        if (!this.dialog?.open) return;
        this.returnValue = returnValue;
        this.dialog.close();
    }

    // Slotted content isn't in the dialog's own tree, so the browser's
    // dialog focusing steps don't see an `autofocus` on it. Find one in
    // the light DOM — it may be a custom element whose own focus() moves
    // into its shadow root (juel-text, juel-button).
    private focusInitial() {
        const target = this.querySelector<HTMLElement>('[autofocus]')
            ?? this.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"]), juel-text, juel-select, juel-button');
        if (!target) return;
        const upgraded = target as HTMLElement & { updateComplete?: Promise<unknown> };
        (upgraded.updateComplete ?? Promise.resolve()).then(() => target.focus());
    }

    private dismiss() {
        if (!this.dismissible) return;
        const evt = new CustomEvent('modal-cancel', { bubbles: true, composed: true, cancelable: true });
        if (!this.dispatchEvent(evt)) return;
        this.close('');
    }

    private onCancel = (e: Event) => {
        // Escape: dismiss through the same path as the close button, so
        // modal-cancel can veto it and the close event carries ''.
        e.preventDefault();
        this.dismiss();
    };

    // A `close` event is a queued task, so it can arrive after the dialog
    // was shown again (closed, then reopened at once): the dialog is open,
    // so it's stale. Ignore it, or `opened` and `modal-closed` would say
    // closed while the native modal still covers the page.
    private onClose = () => {
        if (this.dialog?.open) return;
        this.opened = false;
        this.dispatchEvent(new CustomEvent<ModalClosedDetail>('modal-closed', {
            detail: { returnValue: this.returnValue },
            bubbles: true,
            composed: true,
        }));
    };

    // A click on the backdrop lands on the <dialog> element itself; one on
    // its content lands on (or inside) .container.
    private onClick = (e: MouseEvent) => {
        if (e.target === this.dialog) this.dismiss();
    };

    render() {
        return html`<dialog part="dialog" aria-labelledby="title"
                @cancel=${this.onCancel} @close=${this.onClose} @click=${this.onClick}>
            <div class="container" part="container">
                <div class="header" part="header">
                    <div id="title" class="title"><slot name="title">${this.label ?? ''}</slot></div>
                    ${this.dismissible ? html`<juel-button type="plain" class="close" part="close" glyph="close" button-label="Close" title="Close" @click=${() => this.dismiss()}></juel-button>` : ''}
                </div>
                <div class="content" part="content"><slot></slot></div>
                <div class="buttons ${this.hasButtons ? '' : 'empty'}" part="buttons"><slot name="buttons"
                    @slotchange=${(e: Event) => this.hasButtons = (e.target as HTMLSlotElement).assignedElements().length > 0}></slot></div>
            </div>
        </dialog>`;
    }
}

declare global {
    interface HTMLElementTagNameMap { 'juel-modal': JuelModal }
}
