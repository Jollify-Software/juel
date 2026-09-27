export enum TableEvents {
    CellClicked = "cell-clicked",
    RowSelected = "row-selected",
    // "The user chose this row" — independent of which cell they hit, and
    // fired by Enter/Space as well as by a click, so a consumer that navigates
    // on a row (rather than reacting to a particular column) works for
    // keyboard users too. cell-clicked stays mouse-only by nature.
    RowActivated = "row-activated"
}
