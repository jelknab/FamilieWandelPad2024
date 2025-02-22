import { Component } from '@angular/core';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { latLng, latLngBounds, tileLayer, Map, geoJSON, GeoJSON, MapOptions } from 'leaflet';
import { LineString, Polygon, Position as GeoPosition } from 'geojson';
import { GeoService } from 'src/app/services/geo.service';
import { getSection, routePoints, sections } from "../../helpers/routeHelpers"
import { Position } from '@capacitor/geolocation';
import { fromEvent, startWith } from 'rxjs';
import { style } from '@angular/animations';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  imports: [
    LeafletModule
  ],
  standalone: true
})
export class MapComponent {
  options: MapOptions = {
    layers: [
      tileLayer('assets/map-tiles/{z}/{x}/{y}.png', { minNativeZoom: 16, maxNativeZoom: 18, minZoom: 15, maxZoom: 19 }),
    ],
    zoom: 18,
    minZoom: 16,
    maxZoom: 19,
    center: latLng({ lat: 52.215754, lng: 4.558665 }),
    maxBounds: latLngBounds({ lat: 52.207471, lng: 4.548644 }, { lat: 52.224326, lng: 4.572674 })
  };

  zoomLevelStrokeScale: {[key: number]: number} = {
    15: .5,
    16: .5,
    17: .5,
    18: .75,
    19: 1.25
  }

  constructor(
    private geoService: GeoService,
    private navigationService: NavigationService
  ) {
  }

  onMapReady(map: Map) {
    const position$ = this.geoService.fakeGeolocationObservable(12, 500, latLng({lat: 52.216210, lng: 4.558076}));

    this.navigationService.startNavigation(position$);

    position$.subscribe(p => {
      map.panTo(latLng({lat: p.coords.latitude, lng: p.coords.longitude}), { animate: true, duration: .5 });
    });

    const pathLayer = this.routeToLineString().addTo(map);
      

    fromEvent(map, 'zoomend')
      .pipe(
        startWith(null)
      )
      .subscribe(e => {
        pathLayer.setStyle({
          color: "#4b4b96",
          weight: 10 * this.zoomLevelStrokeScale[map.getZoom()],
          opacity: 1
        })
      });

    setTimeout(() => {
      map.invalidateSize()
    }, 0);
  }

  private routeToLineString(): GeoJSON<Position, LineString> {
    return geoJSON<Position, LineString>(
      {
        type: 'LineString',
        coordinates: routePoints
          .sort((a, b) => b.orderIndex - a.orderIndex)
          .filter(rp => rp.routeId === 1)
          .map(routePoint => [routePoint.longitude, routePoint.latitude])
      } as LineString,
      {
      }
    );
  }

}
