import {Component, inject, signal} from '@angular/core';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import {latLng, latLngBounds, tileLayer, Map, geoJSON, GeoJSON, MapOptions, icon, marker, LatLng, DivIcon, LeafletMouseEvent} from 'leaflet';
import { LineString, Polygon, Position as GeoPosition } from 'geojson';
import { GeoService } from 'src/app/services/geo.service';
import {getSection, routePoints, sections, Waypoint} from "../../helpers/routeHelpers"
import { Position } from '@capacitor/geolocation';
import {
  fromEvent,
  startWith,
  combineLatest,
  distinctUntilChanged,
  map,
  map as rxjsMap,
  filter,
  switchMap,
  shareReplay,
  Observable, timer, tap
} from 'rxjs';
import { NavigationService } from 'src/app/services/navigation.service';
import 'leaflet-rotatedmarker';
import {IonCard, IonCardContent, ModalController} from "@ionic/angular/standalone";
import {PointOfInterestComponent} from "../point-of-interest/point-of-interest.component";
import {AsyncPipe, DecimalPipe} from "@angular/common";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {environment} from "../../../environments/environment";

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
  imports: [
    LeafletModule,
    IonCard,
    IonCardContent,
    AsyncPipe,
    DecimalPipe
  ]
})
export class MapComponent {
  options: MapOptions = {
    layers: [
      tileLayer('assets/map-tiles/{z}/{x}/{y}.png', { minNativeZoom: 16, maxNativeZoom: 18, minZoom: 15, maxZoom: 19, attribution: '© OpenStreetMap' }),
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
  modalController = inject(ModalController);

  distanceWalked$ = this.navigationService.walkedRoute$.pipe(
    map((points: LatLng[]) => {
      if (!points || points.length < 2) return 0;
      const totalMeters = points.slice(1).reduce((total, point, i) => {
        return total + point.distanceTo(points[i]);
      }, 0);
      const totalKilometers = totalMeters / 1000;
      return parseFloat(totalKilometers.toFixed(2)); // Round to 2 decimal places
    }),
    shareReplay(1)
  );

  totalDistance = signal(this.computeTotalDistance(routePoints.map(rp => rp.latlng), 1))

  constructor() {
    this.reactToLandmarkVisits();
  }

  onMapReady(map: Map) {
    map.zoomControl.setPosition('bottomright')

    let position$: Observable<Position>;
    if (environment.production) {
      position$ = this.geoService.position$;
    } else {
      position$ = this.geoService.fakeGeolocationObservable(6, 500, latLng({lat: 52.216210, lng: 4.558076}));

      for (let routePoint of routePoints) {
        marker([routePoint.latlng.lat, routePoint.latlng.lng], {
          icon: new DivIcon({
            html: `<p style="white-space: nowrap">${routePoint.id}</p><p style="white-space: nowrap">${routePoint.orderIndex}</p>`
          })
        })
          .addTo(map)
      }
    }

    this.navigationService.startNavigation(position$);

    const paused$ = fromEvent(map, 'dragstart')
      .pipe(
        switchMap(() => timer(5000).pipe(rxjsMap(() => false), startWith(true))),
        startWith(false)
      );
    combineLatest([position$, paused$]).subscribe(([position, paused]) => {
      if (!paused) {
        map.panTo(latLng({lat: position.coords.latitude, lng: position.coords.longitude}), { animate: true, duration: 1 });
      }
    });

    const navigationArrowIcon = icon({
      iconUrl: 'assets/icon/navigationArrow.svg',
      iconSize: [50, 50], // Adjust the size as necessary
      iconAnchor: [25, 25]
    });

    const navigationArrowMarker = marker([0, 0], { icon: navigationArrowIcon })
      .addTo(map);

    combineLatest([this.navigationService.position$, this.navigationService.visitedWaypoints$, this.navigationService.walkedRoute$])
      .subscribe(([position, visitedWaypoints, walked]) => {
        const lastWalkedPoint = walked.at(-1);
        if  (lastWalkedPoint) {
          navigationArrowMarker.setLatLng(lastWalkedPoint);
        }

        if (walked.length >= 2) {
          const angle = this.calculateHeading(
            latLng(walked.at(-1)!),
            latLng(walked.at(-2)!)
          );

          navigationArrowMarker.setRotationAngle(-angle - 90);
        }
      });

    const landmarkIcon = icon({
      iconUrl: 'assets/icon/Pin.svg',
      iconSize: [36, 56],
      iconAnchor: [18, 56]
    });

    for (const landmark of this.landmarksFromRoute()) {
      const landmarkMarker = marker(landmark.latlng, {icon: landmarkIcon}).addTo(map);
      fromEvent(landmarkMarker, 'click')
        .subscribe(() => {
          this.openPoiModal(landmark);
        })
    }

    const pathLayerStroke = this.routeToLineString().addTo(map);
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
      walkedRouteLayer.setStyle({
        color: "#e8e8e8",
        weight: 10 * this.zoomLevelStrokeScale[map.getZoom()],
        opacity: 1
      });
    });

    fromEvent<LeafletMouseEvent>(map, 'click')
      .subscribe((click) => {
        console.log(click);
      })

    fromEvent(map, 'zoomend')
      .pipe(
        startWith(null)
      )
      .subscribe(e => {
        pathLayer.setStyle({
          color: "#2c72c7",
          weight: 14 * this.zoomLevelStrokeScale[map.getZoom()],
          opacity: 1
        });
        pathLayerStroke.setStyle({
          color: "#20589a",
          weight: 16 * this.zoomLevelStrokeScale[map.getZoom()],
          opacity: 1
        });
      });

    setTimeout(() => {
      map.invalidateSize()
    }, 0);
  }

  private reactToLandmarkVisits() {
    this.navigationService.visitedWaypoints$
      .pipe(
        map(visitedWaypoints => {
          return visitedWaypoints.last
        }),
        filter((waypoint): waypoint is Waypoint => waypoint !== null),
        distinctUntilChanged((a, b) => a.id === b.id),
        filter(waypoint => waypoint.type === 'PointOfInterest'),
        switchMap(waypoint => {
          return this.openPoiModal(waypoint)
            .then(() => Haptics.impact({ style: ImpactStyle.Medium }));
        })
      )
      .subscribe()
  }

  private async openPoiModal(waypoint: Waypoint) {
    const modal = await this.modalController.create({
      component: PointOfInterestComponent,
      componentProps: {
        waypointSet: waypoint
      }
    });

    await modal.present()
  }

  private routeToLineString(): GeoJSON<Position, LineString> {
    const path = routePoints
      .sort((a, b) => b.orderIndex - a.orderIndex)
      .filter(rp => rp.routeId === 1)
      .map(routePoint => [routePoint.longitude, routePoint.latitude]);



    return geoJSON<Position, LineString>(
      {
        type: 'LineString',
        coordinates: [...path, path[0]]
      } as LineString,
      {
      }
    );
  }

  private computeTotalDistance(points: LatLng[], decimals = 2): number {
    if (!points || points.length < 2) return 0;
    const totalMeters = points.slice(1).reduce((total, point, i) => {
      return total + point.distanceTo(points[i]);
    }, 0);
    const totalKilometers = totalMeters / 1000;
    return parseFloat(totalKilometers.toFixed(decimals)); // Round to 2 decimal places
  }

  private landmarksFromRoute() {
    return routePoints
      .filter(routePoint => routePoint.type === "PointOfInterest")
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
