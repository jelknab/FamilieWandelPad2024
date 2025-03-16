import {Component, inject} from '@angular/core';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import {latLng, latLngBounds, tileLayer, Map, geoJSON, GeoJSON, MapOptions, icon, marker, LatLng} from 'leaflet';
import { LineString, Polygon, Position as GeoPosition } from 'geojson';
import { GeoService } from 'src/app/services/geo.service';
import { getSection, routePoints, sections } from "../../helpers/routeHelpers"
import { Position } from '@capacitor/geolocation';
import { fromEvent, startWith, combineLatest } from 'rxjs';
import { style } from '@angular/animations';
import { NavigationService } from 'src/app/services/navigation.service';
import 'leaflet-rotatedmarker';

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

  geoService = inject(GeoService);
  navigationService = inject(NavigationService);

  constructor() {
    reactToLandmarkVisits()
  }

  onMapReady(map: Map) {
    const position$ = this.geoService.fakeGeolocationObservable(12, 500, latLng({lat: 52.216210, lng: 4.558076}));

    this.navigationService.startNavigation(position$);

    position$.subscribe(p => {
      map.panTo(latLng({lat: p.coords.latitude, lng: p.coords.longitude}), { animate: true, duration: .5 });
    });

    const navigationArrowIcon = icon({
      iconUrl: 'assets/icon/navigationArrow.svg',
      iconSize: [50, 50], // Adjust the size as necessary
      iconAnchor: [25, 25]
    });

    const navigationArrowMarker = marker([0, 0], { icon: navigationArrowIcon })
      .addTo(map);

    combineLatest([this.navigationService.position$, this.navigationService.visitedWaypoints$])
      .subscribe(([position, visitedWaypoints]) => {
        navigationArrowMarker.setLatLng({ lat: position.coords.latitude, lng: position.coords.longitude });

        if (visitedWaypoints.target) {
          const angle = this.calculateHeading(
            latLng({lat: position.coords.latitude, lng: position.coords.longitude}),
            latLng({lat: visitedWaypoints.target.latitude, lng: visitedWaypoints.target.longitude})
            );

          navigationArrowMarker.setRotationAngle(-angle + 90);
        }
      });

    const pathLayer = this.routeToLineString().addTo(map);
    const walkedRouteLayer = geoJSON<Position, LineString>({
      type: 'LineString',
      coordinates: []
    } as LineString).addTo(map);

    this.navigationService.walkedRoute$.subscribe(waypoints => {
      const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);
      walkedRouteLayer.clearLayers();
      walkedRouteLayer.addData({
        type: 'LineString',
        coordinates: coordinates
      } as LineString);
    });

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

  private reactToLandmarkVisits() {
    this.navigationService.
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

  private calculateHeading(current: LatLng, next: LatLng): number {
    const dy = next.lat - current.lat;
    const dx = next.lng - current.lng;

    // Calculate the angle in radians, then convert to degrees
    const angleInRadians = Math.atan2(dy, dx);
    const angleInDegrees = (angleInRadians * 180) / Math.PI;

    // Normalize the angle to 0-360 degrees
    return (angleInDegrees + 360) % 360;
  }


}
