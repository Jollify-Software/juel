export module ArrayTraversalModule {
    export var traverseForward = (index: number, array: any[]) => {
        let n = index + 1;
        // Check we can move forwards
        if (n < array.length) {
            let tmp = array[n];
            array[n] = array[index];
            array[index] = tmp;
            return n;
        }
    }
    export var traverseBackward = (index: number, array: any[]) => {
        let n = index - 1;
        // Check we can move forwards
        if (n >= 0) {
            let tmp = array[n];
            array[n] = array[index];
            array[index] = tmp;
            return n;
        }
    }
}