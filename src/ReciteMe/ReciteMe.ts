import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import icon from "data-url:~/icons/access.svg";
import Styles from "bundle-text:./ReciteMe.less";

declare var Recite: any;
declare function _reciteLoaded();

@customElement("juel-reciteme")
export class JuelReciteme extends LitElement {

    static styles = unsafeCSS(Styles);

    static ReciteScriptID = "juel-recite";

    //selector = "#reciteme-launch";
    serviceUrl: string;
    @property() key: string;
    options: object;
    autoLoad = false;
    //enableFragment = "#reciteEnable";

    constructor() {
        super();
        this.serviceUrl = "https://api.reciteme.com/asset/js?key=";
        this.options = {
            "autoEnable": 0,
            "Tracker": {
                "Ga": { "enabled": true }
            },
            "Docreader": { "endpoint": "https:\/\/docreader.reciteme.com\/doc\/url?q=" }
        };
    }

    render() {
        return html`<juel-button type="light" @button-clicked="${this.loadReciteServive}">
        <div slot="content" style="width: 32px; height: 32px;background-image: url(${icon});""></div>
        </juel-button>`;
    }

    docReaderDownload() {
        //any elements with the class downlopadlink that have been updated for docreader should be reset..
        var selector = "A.downloadlink[href*='docreader.reciteme.com']";
        var list = document.querySelectorAll(selector);
        for (var i = 0; i < list.length; i++) {
            var href = list[i].getAttribute("href");
            if (href != "" && href != "undefined") {
                href = href.replace("https://docreader.reciteme.com/doc/url?q=", "");
                href = href.replace("http://docreader.reciteme.com/doc/url?q=", "");
                list[i].setAttribute('href', href);
            }
        }
    }

    loadReciteScript(src: string, callback: Function) {
        console.log("Load script");
        let script = $(document.head.querySelector(`#${JuelReciteme.ReciteScriptID}`)) as JQuery<HTMLScriptElement>;
        console.log(!(script) || script.length <= 0);
        if (!(script) || script.length <= 0) {
            script = $(document.createElement("script"));
            $(document.head).append(script);
            script[0].id = JuelReciteme.ReciteScriptID;
            script[0].type = "text/javascript";
            script[0].onload = () => {
                console.log("script load");
                callback()
            };
            script[0].src = src;
        }
    }

    //function _rc(c){c+="=";for(var b=document.cookie.split(";"),a=0;a<b.length;a++){for(var d=b[a];" "==d.charAt(0);)d=d.substring(1,d.length);if(0==d.indexOf(c))return d.substring(c.length,d.length)}return null}

    loadReciteServive(c) {
        this.loadReciteScript(this.serviceUrl + this.key, () => {
            "function" === typeof _reciteLoaded && _reciteLoaded();
            console.log("callback");
            "function" == typeof c && c();
            Recite.load(this.options);
            Recite.Event.subscribe("Recite:load", function () {
                console.log("Recite loaded");
                Recite.enable()
            })
        })
    }
}