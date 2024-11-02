export function EnumConverter(enumType: any) {
    return (value: string) => {
         let i: keyof typeof enumType = value;
         let v = enumType[i];
         return v;
    }
}