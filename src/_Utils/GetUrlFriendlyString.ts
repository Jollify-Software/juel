export function getUrlFriendlyString(obj: object) {
    return Object.keys(obj)
        .map(key => {
            let value =  obj[key] as string;
            return `${key}=${value.replace(" ", "+")}`;
        }).join("&");
}