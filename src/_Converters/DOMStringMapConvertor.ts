export function DOMStringMapConverter(value: string) {
    let toReturn = value.split(';')
        .map(str => {
            let ray = str.split(':');
            let name = ray[0];
            let val = ray[1].trim();
            let obj = {};
            obj[name] = val == "true" ? true :
                val == "false" ? false : val;
            return obj;
        }).reduce((a, b) => ({ ...a, ...b }));
    return toReturn;
}