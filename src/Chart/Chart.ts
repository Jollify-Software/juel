import { html, LitElement } from "lit";
import { property, customElement } from "lit/decorators";

@customElement("juel-chart")
export class JuelChart extends LitElement {
    @property({ type: Number}) width: number;
    @property({ type: Number}) height: number;
    @property() type: string;
    @property({ type: Boolean}) responsive: boolean;
    @property() legend: string;
    @property() indexAxis: string;

    chart: any;
    data: any;
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;

    constructor() {
        super();

        this.width = 400;
        this.height = 400;
        this.type = "bar";        
    }

    updated() {
        setTimeout(() => {
            if ('Chart' in window) {
            let data = this.getData();

            let plugins: any = {};
            if (this.legend) {
                if (this.legend == "false") {
                    plugins.legend = {
                        display: false
                    };
                } else {
                    plugins.legend = {
                        position: this.legend
                    };
                }
            }
            if (this.title) {
                plugins.title = {
                    display: true,
                    text: this.title
                }
            }
            let options: any = {
                responsive: this.responsive
            };
            if (this.indexAxis) {
                options.indexAxis = this.indexAxis;
            }
            if (plugins) {
                options.plugins = plugins;
            }

            let config: any = {
                type: this.type,
                data: data,
                options: options
            };
            console.log(config);

            let ChartFunc = window['Chart'] as any;
            this.chart = new ChartFunc(this.g, config)

        }
        });
    }

    getData() {
        if (this.data) {
            return this.data;
        } else {
            let el = this.shadowRoot.getElementById("data").firstElementChild as HTMLSlotElement;
            let els = el.assignedNodes();
            this.data = JSON.parse(els[0].nodeValue);
            this.g = (<HTMLCanvasElement>this.shadowRoot.getElementById("canvas"))
                .getContext("2d");
            return this.data;
        }
    }

    render() {
        return html`<div id="data" style="display:none"><slot></slot></div><canvas id="canvas" width="${this.width}" height="${this.height}""></canvas>`;
    }
}