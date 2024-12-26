import { getUrlFriendlyString } from "../../_Utils/GetUrlFriendlyString";
import { JuelMap } from "../Map";
import { MapModeType } from "../MapModeType";
import { GoogleMapBootstrap } from "./GoogleMapBootstrap";
import { IMapProvider } from "./IMapProvider";

/**
 * @see https://developers.google.com/maps/documentation/javascript
 */
export class GoogleMapProvider implements IMapProvider {

  Place: google.maps.Place

    static BootstrapID = "google-maps-bootstrap";

    apiKey: string;
    mode: MapModeType
    parameters: object;

    resolve: (value: unknown) => void;
    scriptLoad: Promise<void> = new Promise((resolve) => this.resolve = resolve)
    map: google.maps.Map;

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
        GoogleMapBootstrap(apiKey);
    }

    setMode(mode: MapModeType) {
        this.mode = mode;
    }

    setParameters(parameters: object) {
        this.parameters = parameters
    }

    getMap() {
      return this.map;
    }
    
    async init(element: JuelMap): Promise<void> {

          // The location of Uluru
  const position = { lat: -25.344, lng: 131.031 };

  // Request needed libraries.
  //@ts-ignore
  const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

  // The map, centered at Uluru
  this.map = new Map(
    element,
    {
      zoom: 4,
      center: position,
      mapId: 'DEMO_MAP_ID',
    }
  );
  // The marker, positioned at Uluru
  const marker = new AdvancedMarkerElement({
    map: this.map,
    position: position,
    title: 'Uluru'
  });

    if (element.places) {
      for (let place in element.places) {
        await this.addPlace(place);
      }
    }

    }

    async addPlace(str: string) {
      let map = this.map;
      const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      const request = {
          textQuery: str,
          fields: ['displayName', 'location', 'businessStatus']
      };
  
      //@ts-ignore
      const { places } = await Place.searchByText(request);
  
      if (places.length) {
          console.log(places);
  
          const { LatLngBounds } = await google.maps.importLibrary("core") as google.maps.CoreLibrary;
          const bounds = new LatLngBounds();
  
          // Loop through and get all the results.
          places.forEach((place) => {
              const markerView = new AdvancedMarkerElement({
                  map,
                  position: place.location,
                  title: place.displayName,
              });
  
              bounds.extend(place.location as google.maps.LatLng);
              console.log(place);
          });
  
          map.fitBounds(bounds);
  
      } else {
          console.log('No results');
      }
  
    }

    getSrc() {
        return `https://www.google.com/maps/embed/v1/${this.mode}?key=${this.apiKey}&${getUrlFriendlyString(this.parameters)}`;
    }
}