import { JuelModule } from "./_Modules/JuelModule";
import $ from "jquery";
import Styles from "bundle-text:./_CommonStyles/juel.less";

(<any>window).juel = JuelModule;
(<any>window).$ = $;
(<any>window).jQuery = $;

(function() {
    let style = document.createElement("style");
    style.id = "juel-styles";
    style.textContent = Styles;
    document.head.append(style);
    // TODO Loop around all icon-XX variables and append to hidden SVG
})();