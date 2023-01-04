import { JuelModule } from "./_Modules/JuelModule";
import "./_Modules/WindowModule";
import $ from "jquery";
import Styles from "bundle-text:./_CommonStyles/juel.less";

import { IsMobile } from './_Utils/IsMobile';
import { Vh } from './_Utils/Vh';

(<any>window).juel = JuelModule;
(<any>window).$ = $;
(<any>window).jQuery = $;

(function() {
    IsMobile();
    Vh();
    
    let style = document.createElement("style");
    style.id = "juel-styles";
    style.textContent = Styles;
    document.head.append(style);
    // TODO Loop around all icon-XX variables and append to hidden SVG
})();