import { MessageBoxResultStatus } from "./MessageBoxResultStatus";

export interface MessageBoxResult {
    status: MessageBoxResultStatus;
    value?: any;
}