import { CopyComputedStyles } from "../_Utils/CopyComutedStyles";
import { CopyStyles } from "../_Utils/CopyStyles";

export module TransitionModule {
    const transitionNameRegEx = /(transition-?[0-9a-z]*)/;

    export var initTransitions = () => {
        var elements = document.querySelectorAll('[class*="transition"]');
        for (let i = 0;i<elements.length;i++) {
            if (i == 0) {
                continue;
            }
            let element = elements[i] as HTMLElement;
            let previous = elements[i-1] as HTMLElement;
            element.classList.remove("transition");
            let styles = element.getAttribute("style");
            CopyComputedStyles(previous, element)
            setTimeout(() => {
                element.classList.add("transition");
                console.log(styles)
                element.setAttribute("style", styles)
            }, 10);
        }
    }
    export var transitionElement = (element: HTMLElement) => {
        let result = transitionNameRegEx.exec(element.className);
        if (result && result.length > 0) {
            let lastMatch = result[result.length-1];
            console.log("Searching for transitions named: " + lastMatch)
            let elements = Array.from(document.querySelectorAll(`.${lastMatch}`));
            let index = elements.indexOf(element);
            if (index == 0) {
                return;
            }
            let previous = elements[index-1] as HTMLElement;
            element.classList.remove("transition");
            let styles = element.getAttribute("style");
            CopyComputedStyles(previous, element)
            setTimeout(() => {
                element.classList.add("transition");
                console.log(styles)
                element.setAttribute("style", styles)
            }, 10);
        }
    }
}