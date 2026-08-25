import { html, TemplateResult } from "lit";
import { choose } from "lit/directives/choose";
import { when } from "lit/directives/when";
import { FieldChangedHandler } from "./FieldChangedHandler";
import { FormField } from "./FormField";

export function FieldTemplate(field: FormField): TemplateResult {
    return html`${choose(field.type, [
        [ 'text', () => html`<juel-text .value=${field.value} @value-changed=${FieldChangedHandler(field)} label="${field.label}"></juel-text>`],
        [ 'number', () => html`<juel-number .value=${field.value} @value-changed=${FieldChangedHandler(field)} label="${field.label}"></juel-number>`],
        [ 'email', () => html`<juel-email .value=${field.value} @value-changed=${FieldChangedHandler(field)} label="${field.label}"></juel-email>`],
    ], () => html`<juel-text .value=${field.value} @value-changed=${FieldChangedHandler(field)} label="${field.label}"></juel-text>`)}${when(field.break, () => html`<div class="break"></div>`)}`;
}