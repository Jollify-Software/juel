export enum KnownProperties {
    id = "id",
    name = "name",
    description = "description",
    text = "text",
    label = "label"
}

export function GetDisplayKnownProperty(obj: object): string {
    if (KnownProperties.description in obj) {
        return obj[KnownProperties.description];
    } else if (KnownProperties.name in obj) {
        return obj[KnownProperties.name];
    } else if (KnownProperties.text in obj) {
        return obj[KnownProperties.text];
    } else if (KnownProperties.label in obj) {
        return obj[KnownProperties.label];
    }
    return "";
}