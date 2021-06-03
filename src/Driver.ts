import "./JuelGlobal";
import * as driver from "driver.js";
import Styles from "bundle-text:driver.js/dist/driver.min.css";

(<any>window).juel.driver = driver;

$(function() {
    let style = document.createElement("style");
    style.id = "driver-styles";
    style.textContent = Styles;
    document.head.append(style);
})