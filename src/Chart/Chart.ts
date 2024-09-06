import Chart from "chart.js";
import { html, LitElement, PropertyValueMap } from "lit";
import { property, customElement } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { ArrayConverter } from "../_Converters/ArrayConverter";

@customElement("juel-chart")
export class JuelChart extends JuelComponent {

    static ChartScriptId: string = "juel-chart-js";
    static ChartScriptUrl: string = "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js";

    chartScriptLoaded: Promise<any>;

    @property({ type: Number}) width: number;
    @property({ type: Number}) height: number;
    @property() type: string;
    @property({ converter: ArrayConverter(',') }) labels: string[];
    @property({ type: Boolean}) responsive: boolean;
    @property() legend: string;
    @property() indexAxis: string;

    chart: Chart;
    @property({ type: Object }) data: any;
    @property({ type: Object }) options: any;
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;

    constructor() {
        super();

        this.width = 400;
        this.height = 400;
        this.type = "bar";
        this.data = {};
        this.options = {};
    }

    protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.data.labels = this.labels

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
            this.options.responsive = this.responsive;
            if (this.indexAxis) {
                this.options.indexAxis = this.indexAxis;
            }
            if (plugins) {
                this.options.plugins = plugins;
            }

            this.g = (<HTMLCanvasElement>this.shadowRoot.getElementById("canvas"))
                .getContext("2d");
            this.chartScriptLoaded = this.scriptElement();
    }

    async scriptElement() {
        let script = document.querySelector(`#${JuelChart.ChartScriptId}`) as HTMLScriptElement;
        if (!('Chart' in window)) {
            await import(JuelChart.ChartScriptUrl);
        }
    }

    renderChart() {
        this.chartScriptLoaded.then(() => {
            let ChartFunc = window['Chart'] as any;
        let config: any = {
            type: this.type,
            data: this.data,
            options: this.options
        };
        if (!this.chart) {
        this.chart = new ChartFunc(this.g, config)
        } else {
            this.chart.data = this.data;
            this.chart.update();
        }
        });
    }

    render() {
        return html`<canvas id="canvas" width="${this.width}" height="${this.height}""></canvas>`;
    }
}