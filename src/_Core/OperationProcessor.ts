import { Operation } from "./Operation";

export class OperationProcessor {
    process(op: Operation, obj: any) {
        if (op.fieldName in obj) {
            switch (op.operator) {
                case "=":
                    obj[op.fieldName] = op.value;
                    break;
                case "+":
                case "+=":
                    obj[op.fieldName] += op.value;
                    break;
                case "-":
                case "-=":
                    obj[op.fieldName] -= op.value;
                    break;
                case "*":
                case "*=":
                    obj[op.fieldName] *= op.value;
                    break;
                case "/":
                case "/=":
                    obj[op.fieldName] /= op.value;
                    break;
                case "^":
                case "^=":
                    obj[op.fieldName] ^= op.value;
                    break;
                case "%":
                case "%=":
                    obj[op.fieldName] %= op.value;
                    break;
            }
        }
    }
}