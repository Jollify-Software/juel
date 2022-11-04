export function BooleanConverter(value: string): boolean {
    if (value == "true") {
        return true;
    } else {
        return false;
    }
}