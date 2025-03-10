import { JuelMap } from "./Map";
import { IMapProvider } from "./Providers/IMapProvider";
import { LeafletProvider } from "./Providers/LeafletProvider";

export class MapService {

    mapElement: JuelMap;
    provider: IMapProvider;

    /**
     *
     */
    constructor(mapElement: JuelMap) {
        this.mapElement = mapElement;
        this.init();
    }

    searchManager: Microsoft.Maps.Search.SearchManager;

    init() {
        switch (this.mapElement.provider) {
            /*case "google":
                this.provider = new GoogleMapProvider();
                break;*/
            case "leaflet":
                this.provider = new LeafletProvider();
        }

        if (this.provider) {
            // TODO: Check if token on window object and decrypt
            //this.provider.setApiKey(this.mapElement.token);
            //this.provider.setMode(this.mapElement.mode);
            //this.provider.setParameters(this.mapElement.parameters);

            this.provider.init(this.mapElement);
        }
    }

    getMap() {
        if (this.provider) {
            return this.provider.getMap();
        }
        return "";
    }
/*
    initBingMap(el: JuelMap) {
        let searchTerms: string[] = [];
        for (let child of el.children) {
            let term = child.className;
            searchTerms.push(term);
        }
        let opt: Microsoft.Maps.IMapLoadOptions = {};
        opt.showZoomButtons = true;
        opt.showMapTypeSelector = false;
        var map = new Microsoft.Maps.Map(el, opt);

        for (let term of searchTerms) {
            console.log(term)
            this.geocodeQuery(term, map);
        }
    }

    geocodeQuery(query: string, map: Microsoft.Maps.Map) {
        console.log("Search for " + query)
        //If search manager is not defined, load the search module.
        if (!this.searchManager) {
            //Create an instance of the search manager and call the geocodeQuery function again.
            Microsoft.Maps.loadModule('Microsoft.Maps.Search', () => {
                console.log(map)
                this.searchManager = new Microsoft.Maps.Search.SearchManager(map);
                this.geocodeQuery(query, map);
            });
        } else {
            var searchRequest = {
                where: query,
                callback: function (r) {
                    console.log(r)
                    //Add the first result to the map and zoom into it.
                    if (r && r.results && r.results.length > 0) {
                        console.log(r.results[0].location)
                        var pin = new Microsoft.Maps.Pushpin(r.results[0].location);
                        map.entities.push(pin);

                        map.setView({ bounds: r.results[0].bestView });
                    }
                },
                errorCallback: function (e) {
                    console.log(e)
                }
            };

            console.log(this.searchManager)
            //Make the geocode request.
            this.searchManager.geocode(searchRequest);
        }
    }*/
}