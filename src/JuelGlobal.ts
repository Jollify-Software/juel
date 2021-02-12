import Styles from "bundle-text:./_CommonStyles/juel.less";

(<any>window).juel = {};
import $ from "jquery";

(<any>window).$ = $;
(<any>window).jQuery = $;

$(function() {
    let style = document.createElement("style");
    style.id = "juel-styles";
    style.textContent = Styles;
    document.head.append(style);
})