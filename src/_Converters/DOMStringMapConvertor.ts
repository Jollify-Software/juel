export function DOMStringMapConverter(value: string) {
    let toReturn = value.trim().split(';')
        .map(str => {
            let ray = str.trim().split(':');
            let name = ray[0];
            let val = ray[1] ? ray[1].trim() : "";
            let obj = {};
            obj[name] = val == "true" ? true :
                val == "false" ? false : val;
            return obj;
        }).reduce((a, b) => ({ ...a, ...b }));
    return toReturn;
}