import { MessageBoxPromptField } from "./MessageBoxPromptField";

export interface MessageBoxPrompt {
    prompt: string;
    fields?: MessageBoxPromptField[];
}