import { JuelList } from "./List";

export module BlazorListFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let el = document.getElementById(id) as JuelList;
        if (el) {
            el.addEventListener('selected', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('selected', event.detail);
                dotNet.invokeMethodAsync('setSelected', el.selected);
            });
            el.addEventListener('deselected', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('deselected', event.detail);
                dotNet.invokeMethodAsync('setSelected', el.selected);
            });
        }
    }

    export var setData = (id: string, data: any[]) => {
        let select = document.getElementById(id) as JuelList;
        if (select) {
            select.data = data;
        }
    }
    export var getData = (id: string) => {
        let select = document.getElementById(id) as JuelList;
        if (select) {
            return select.data;
        }
    }

}