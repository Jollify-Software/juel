import { createPopper } from "@popperjs/core";
import { MailToReverse } from "../_Utils/MailToReverseFunction";
import { ReverseString } from "../_Utils/ReverseStringFunction";

(window as any).reverseString = ReverseString;
(window as any).mailToReverse = MailToReverse;

export module WindowModule {
    
    
}