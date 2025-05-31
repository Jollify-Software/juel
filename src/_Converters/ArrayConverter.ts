function GetValue(val: string): any {
    let num = parseFloat(val);
    if (!isNaN(num)) {
        return num;
    } else if (val == "true") {
        return true;
    } else if (val == "false") {
        return false;
    } else if (val.includes(';')) {
        let kv = val.split(';');
        let obj = {};
        for (let str of kv) {
            let spit = str.split(':');
            obj[spit[0]] = spit[1];
        }
        return obj;
    } else {
        return val.trim();
    }
}

export function ArrayConverter(separator: string = " "): (value: string) => any[] {
    return (value: string) => {
        if (value.includes(separator)) {
            let splitty = value.split(separator);
            return splitty.map(val => {
                return GetValue(val);
            })
        } else {
            return [GetValue(value)];
        }
    };
}

export function MultiArrayConvertor(arraySeparator: string = ",", separator: string = " "): (value: string) => any[] | any[][] {
    return (value: string) => {
        if (value.includes(arraySeparator)) {
            let raySplitty = value.split(arraySeparator);
            return raySplitty.map(str => {
                if (str.includes(separator)) {
                    let splitty = str.split(separator);
                    return splitty.map(val => {
                        return GetValue(val);
                    })
                } else {
                    return [GetValue(str)];
                }
            });
        } else {
            return [GetValue(value)];
        }
    };
}