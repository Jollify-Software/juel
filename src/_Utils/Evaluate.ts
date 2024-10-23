export function Evaluate(expression: string, args: any) {
    let func = new Function("x", "return "+expression +";");
    let res = func(args);
    return res;
}