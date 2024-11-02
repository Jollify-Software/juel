import { MessageBoxButtons } from "./MessageBoxButtons";
import { MessageBoxIcon } from "./MessageBoxIcon";
import { MessageBoxDefaultButton } from "./MessageBoxDefaultButtons";

export interface MessageBoxArgs {
    title: string;
    text: string;
    close?: boolean;
    buttons?: MessageBoxButtons;
    labels?: { [id: string]: string };
    icon?: MessageBoxIcon;
    prompt?: string;
    attr?: { [id: string]: string };
    value?: any;
}