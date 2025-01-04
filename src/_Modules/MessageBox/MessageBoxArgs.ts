import { MessageBoxButtons } from "./MessageBoxButtons";
import { MessageBoxIcon } from "./MessageBoxIcon";
import { MessageBoxDefaultButton } from "./MessageBoxDefaultButtons";
import { MessageBoxPrompt } from "./MessageBoxPrompt";

export interface MessageBoxArgs {
    title: string;
    text: string;
    close?: boolean;
    buttons?: MessageBoxButtons;
    labels?: { [id: string]: string };
    icon?: MessageBoxIcon;
    prompt?: MessageBoxPrompt;
    attr?: { [id: string]: string };
    value?: any;
}