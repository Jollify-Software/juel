import { Operation } from "../_Core/Operation"
import { ArgInfo } from "./ArgInfo"

export class ParticleGroup {
    x: string | number
    y: string | number

    args: ArgInfo[]
    behaviour: ArgInfo[]
    update: Operation[];
}