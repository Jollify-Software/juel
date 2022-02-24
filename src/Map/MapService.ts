import { JuelMap } from "./Map";

export class MapService {

    searchManager: Microsoft.Maps.Search.SearchManager;

    init(mapEl: JuelMap) {
        window['InitMap'] = () => {
            if(mapEl.provider && mapEl.provider === "bing") {
                    this.initBingMap(mapEl);
            }
        };
    }

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
    }
}