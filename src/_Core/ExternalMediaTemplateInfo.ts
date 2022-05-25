import { TemplateResult } from "lit";
import { ExternalMediaInfo } from "./ExternalMediaInfo";

export interface ExternalMediaTemplateInfo {
    regexp: RegExp;
    link?: string;
    linkText?: string;
    template: (info: ExternalMediaInfo) => TemplateResult
}