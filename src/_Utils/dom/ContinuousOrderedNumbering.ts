export function continuousOrderedNumbering(): void {
    // Get all <ol> elements on the page
    const orderedLists = document.querySelectorAll<HTMLOListElement>("ol:not(li > ol");

    let cumulativeCount = 0; // Tracks the cumulative count of <li> elements

    orderedLists.forEach((ol) => {
        // Set the 'start' attribute of the current <ol> based on the cumulative count
        ol.start = cumulativeCount + 1;

        // Count the <li> elements within this <ol>
        const listItemCount = $(ol).children("li")?.length;

        // Update the cumulative count
        cumulativeCount += listItemCount;
    });
}