import { ChangedEventArgs } from "../../_Core/Events/ChangedEventArgs";
import { FormField } from "./FormField";

export function FieldChangedHandler(field: FormField) : (e: CustomEvent<ChangedEventArgs>) => void {
    return (e: CustomEvent<ChangedEventArgs>) => {
        field.value = e.detail.value;
    }
}