export enum KnownProperties {
    id = "id",
    name = "name",
    description = "description",
    text = "text",
    label = "label"
}

export function GetDisplayKnownProperty(obj: object): string {
    if (KnownProperties.description in obj) {
        return obj[KnownProperties.description] as string;
    } else if (KnownProperties.name in obj) {
        return obj[KnownProperties.name] as string;
    } else if (KnownProperties.text in obj) {
        return obj[KnownProperties.text] as string;
    } else if (KnownProperties.label in obj) {
        return obj[KnownProperties.label] as string;
    }
    return "";
}