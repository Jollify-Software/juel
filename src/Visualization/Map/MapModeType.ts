export type MapModeType =
    /**
     * displays a map pin at a particular place or address, such as a landmark, business, geographic feature, or town.
     */
    "place" |
    /**
     * returns a map with no markers or directions.
     */
    "view" |
    /**
     * displays the path between two or more specified points on the map, as well as the distance and travel time.
     */
    "directions" |
    /**
     * shows interactive panoramic views from designated locations.
     */
    "streetview" |
    /**
     * shows results for a search across the visible map region.
     */
    "search"
;