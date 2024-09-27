import { customElement, property } from "lit/decorators";
import { CommandBase } from "../_Base/CommandBase";
import { ArrayConverter } from "../_Converters/ArrayConverter";
import { BooleanConverter } from "../_Converters/BooleanConverter";
import { JuelChart } from "./Chart";
import { removeEmpty } from "../_Utils/RemoveEmpty";

@customElement("juel-chart-dataset")
export class JuelChartDataSet extends CommandBase {
    
    @property() label: string;
    @property({ converter: ArrayConverter() }) data: any[];
    @property() type: string;
    @property({ converter: ArrayConverter(), attribute: "background-colour" }) backgroundColour: string[];
    @property({ attribute: "background-colour-hover" }) backgroundColourHover: string;
    @property({ converter: ArrayConverter(), attribute: "border-colour" }) borderColour: string[];
    @property({ type: Number }) borderWidth: number;
    @property({ converter: BooleanConverter }) fill: boolean;
    @property({ attribute: "point-border-colour" }) pointBorderColour: string;
    @property({ attribute: "point-background-colour" }) pointBackgroundColour: string;

    updated() {
        console.log(this.parentElement.nodeName.toUpperCase())
        if (this.parentElement.nodeName.toUpperCase() == "JUEL-CHART") {
            let dataset = {};
            dataset['label'] = this.label;
            dataset['data'] = this.data;
            dataset['type'] = this.type;
            dataset['backgroundColor'] = this.backgroundColour;
            dataset['backgroundColorHover'] = this.backgroundColourHover;
            dataset['borderColor'] = this.borderColour;
            dataset['borderWidth'] = this.borderWidth;
            dataset['fill'] = this.fill;
            dataset['pointBorderColor'] = this.pointBorderColour;
            dataset['pointBackgroundColor'] = this.pointBackgroundColour;
            dataset = removeEmpty(dataset);
            let chart = this.parentElement as JuelChart;
                if ((!chart.data.datasets) || chart.data.datasets.length == 0) {
                    chart.data.datasets = [];
                }
                chart.data.datasets.push(dataset);
                console.log("Call to render chart")
                chart.renderChart();
        }
    }
}