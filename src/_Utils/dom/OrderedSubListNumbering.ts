/**
 * Recursively numbers nested <ol> elements using decimal notation (e.g., 1.1, 1.1.1),
 * respecting the `start` attribute of parent <ol> elements.
 * Prepends the calculated number to each <li> element in the structure.
 * @param ol - The current <ol> element being processed
 * @param prefix - The prefix for numbering (e.g., "1", "1.1")
 */
function numberNestedLists(ol: HTMLOListElement, prefix: string = ""): void {
    // Determine the starting number from the 'start' attribute or default to 1
    const startValue = parseInt($(ol).parents("ol").attr("start") || "1", 10);

    // Get all <li> elements directly under the current <ol>
    const listItems = Array.from(ol.children).filter(
        (child) => child.tagName === "LI"
    ) as HTMLLIElement[];

    // Loop through each <li> and calculate its numbering
    listItems.forEach((li, index) => {
        // Calculate the current number considering the start value
        const currentNumber = `${prefix}${index + 1}`;

        // Prepend the numbering to the <li>'s text
        $(li).prepend(
            $(`<span class="marker" />`).append(currentNumber)
        );

        // Check if this <li> contains a nested <ol>
        const nestedOl = li.querySelector("ol");
        if (nestedOl) {
            // Recursively number the nested <ol>
            numberNestedLists(nestedOl, `${currentNumber}.`);
        }
    });
}

/**
 * Initializes the numbering for all top-level <ol> elements on the page.
 */
export function orderedSubListNumbering(): void {
    const orderedLists = document.querySelectorAll<HTMLOListElement>("li > ol");

    orderedLists.forEach((ol) => {
        let parentOl = $(ol).parents("ol").first();
        const startValue = parseInt(parentOl.attr("start") || "1", 10);
        let count = 0;
        let children = parentOl.children().toArray();
        for (let child of children) {
            if (child == ol.parentElement)
                break;
            count++;
        }
        let prefix = startValue + count;

            numberNestedLists(ol, `${prefix}.`);
    });
}