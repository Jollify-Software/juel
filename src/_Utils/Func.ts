export function Func(body: string, objName: string, obj: object) {
    return new Function(objName, `return ${body}`)(obj).call(this, obj);
}