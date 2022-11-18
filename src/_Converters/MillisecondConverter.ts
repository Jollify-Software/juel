export function MillisecondConverter(defaultValue: number) {
    return (value: string) => {
        if ((!value) || value == "true") {
            return defaultValue;
        } else if (value.endsWith("ms")) {
            return parseFloat(value.replace("ms", ""));
        } else if (value.endsWith("s")) {
            return parseFloat(value.replace("s", "")) * 1000;
        }
    };
}