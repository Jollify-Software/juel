import bind from "bind-decorator";
import { LitElement, PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("juel-preload")
export class JuelPreload extends LitElement {

    @property() type: string
    @property() exclude: string[];

    numOfAssets: number = 0;
    loadedAssetCount: number = 0;

    assetsReady = new Promise((resolve, reject) => {
        this.assetsResolver = resolve
    });
    assetsResolver: (value) => void;

    constructor() {
        super();
        this.type = "all";
    }

    firstUpdated(): void {
        window['assetsReady'] = this.assetsReady;
        window['waitAssetsReady'] = () => this.assetsReady;

        let promise = ('reportReady' in window) ? window['reportReady'] : $.ready;
        
            $.when(promise).then(() => this.ready());
        
    }

    ready() {
        if (this.type == "css" || this.type == "all") {
            let regex = /(?<=url\()[\w:/._\-%]+(?=\);?)/g;
            let styles: HTMLStyleElement[] = Array.prototype.slice.call(document.head.getElementsByTagName('style'));
            styles = styles.concat(Array.prototype.slice.call(document.body.getElementsByTagName('style')));
            styles = styles.filter(el => el.id != 'juel-styles');
            for (let el of styles) {
                let res = el.textContent.match(regex);
                if (res) {
                    this.numOfAssets += res.length;
                    res.forEach(match => {
                        console.log(match);
                        let img = new Image();
                        img.onload = () => this.assetLoad();
                        img.src = match;
                    });
                }
            }
        }
        if (this.type == 'element' || this.type == 'all') {
            let els: HTMLImageElement[] = Array.from(document.body.querySelectorAll('img'));
            console.log(document.body.innerHTML)
            console.log(els.length)
            this.numOfAssets += els.length;
            for (let el of els) {
                console.log(el.src);
                let img = new Image();
                img.onload = () => this.assetLoad();
                img.src = el.src;
            }
        }
        if (this.numOfAssets == 0) {
            this.assetsResolver(true);
        }
    }

    @bind
    assetLoad() {
        this.loadedAssetCount++;
        console.log("Number of assets loaded: " + this.loadedAssetCount + " out of total: " +this.numOfAssets)
        if (this.loadedAssetCount == this.numOfAssets) {
            this.assetsResolver(true);
        }
    }

    protected createRenderRoot(): HTMLElement | ShadowRoot {
        return this;
    }
}