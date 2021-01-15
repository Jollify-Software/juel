import { Select } from "./Select";

export module BlazorSelectFunctions {
    export var register = (id: string, dotNet: DotNet.DotNetObject) => {
        let select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', function(event: CustomEvent) {
                dotNet.invokeMethodAsync('change', event.detail)
            });
        }
    }

    export var setData = (id: string, data: any[]) => {
        let select = document.getElementById(id) as Select;
        if (select) {
            select.data = data;
        }
    }
    export var getData = (id: string) => {
        let select = document.getElementById(id) as Select;
        if (select) {
            return select.data;
        }
    }

    export var setData = (id: string, data: any[]) => {
        let select = document.getElementById(id) as Select;
        if (select) {
            select.value = data;
        }
    }
    export var getValue = (id: string) => {
        let select = document.getElementById(id) as Select;
        if (select) {
            return select.value;
        }
    }
}