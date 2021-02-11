import "./JuelGlobal";
import * as toastr from "toastr";
import Styles from "bundle-text:toastr/toastr.less";

(<any>window).juel.toastr = toastr;

$(function() {
    let style = document.createElement("style");
    style.id = "toastr-styles";
    style.textContent = Styles;
    document.head.append(style);
})