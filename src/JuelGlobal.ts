(function() {
    let style = document.createElement("style");
    style.id = "juel-styles";
    style.textContent = Styles;
    document.head.append(style);
})();

import { JuelModule } from "./_Modules/JuelModule";
import "./_Modules/WindowModule";
import $ from "jquery";
import Styles from "bundle-text:./_CommonStyles/juel.less";

import { IsMobile } from './_Utils/IsMobile';
import { Vh } from './_Utils/Vh';
import { ReverseString } from "./_Utils/ReverseStringFunction";
import { TransitionModule } from "./_Modules/TransistionModule";
import { WindowModule } from "./_Modules/WindowModule";
import { ColourClasses } from "./ColourClasses";
import { Iconify } from "./_Modules/Icons/IconifyFunction";
import { DomReady } from "./_Utils/DomReady";

(<any>window).juel = JuelModule;
// A large number of components (ListBase, Toggle, Lightbox, Modal, etc.) reference
// the bare global `$`/`jQuery` with no local import of their own. jQuery does NOT
// self-attach to window when bundled via a CommonJS-style import (Parcel), so this
// explicit assignment is required for those components to keep working.
(<any>window).$ = $;
(<any>window).jQuery = $;

(function() {
    IsMobile();
    Vh()
})();
DomReady().then(() => {
    let elements = document.querySelectorAll(".reverse") as NodeListOf<HTMLElement>;
    for (let a of elements) {
        let text = ReverseString(a.textContent);
        a.textContent = text;
        if (a.hasAttribute("href")) {
            let href = a.getAttribute("href");
            if (href.startsWith("mailto")) {
                let splity = href.split(':');
                a.setAttribute('href', `mailto:${ReverseString(splity[1])}`);
            } else {
                a.setAttribute('href', ReverseString(href));
            }
        }
    }
    
    Iconify();
    ColourClasses();
    
    WindowModule.documentClick();
    TransitionModule.initTransitions();
});