export function Evaluate(expression: string, args: any) {
    // Expose each property of `args` as a bare identifier so conditions can be
    // written as `slideIndex == 1` rather than `x.slideIndex == 1`. `x` is kept
    // available for the object itself (back-compat / non-object args).
    let keys = (args && typeof args === "object")
        ? Object.keys(args).filter(k => /^[A-Za-z_$][\w$]*$/.test(k))
        : [];
    let func = new Function(...keys, "x", "return (" + expression + ");");
    return func(...keys.map(k => args[k]), args);
}
