export enum TabsEvents {
    TabChanged = "tab-changed",
    TabClose = "tab-close",
    TabReorder = "tab-reorder",
    // Fired whenever a reorderable tab's drag ends, regardless of whether it
    // resulted in a reorder — carries the final pointer position so a
    // consumer (e.g. juel-mdi) can tell whether the tab was released well
    // outside its own layout and react (pop it into its own window).
    TabDragEnd = "tab-drag-end"
}
