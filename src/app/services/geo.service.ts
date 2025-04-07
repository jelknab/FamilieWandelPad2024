import { Injectable } from '@angular/core';
import { filter, Observable, shareReplay, take, interval, map, takeWhile } from 'rxjs';
import { Geolocation, Position } from '@capacitor/geolocation';
import { latLng, LatLng } from 'leaflet';
import {getRouteEnumerable, findOptimalStartingPoint, routePoints, Waypoint} from '../helpers/routeHelpers';

@Injectable({
  providedIn: 'root'
})
export class GeoService {
  public position$ = this.getGeolocationObservable()
    .pipe(
      filter((position): position is Position => position !== null),
      shareReplay({ refCount: true, bufferSize: 1 })
    );

  private getGeolocationObservable(): Observable<Position | null> {
    return new Observable(subscriber => {
      let callbackId: string | null = null;

      Geolocation.watchPosition({}, (cb) => subscriber.next(cb)).then(cbId => callbackId = cbId);

      return function unsubscribe() {
        if (callbackId !== null) {
          Geolocation.clearWatch({ id: callbackId });
        } else {
          console.error("Missing Id during geolocation unsubscribe.");
        }
      }
    })
  }

  public fakeGeolocationObservable(speedKmh: number, intervalMs: number, startingCoordinates: LatLng): Observable<Position> {
    const inputRoute = routePoints
      .sort((a, b) => b.orderIndex - a.orderIndex)
      .filter(rp => rp.routeId === 1);

    const startingPoint = findOptimalStartingPoint(startingCoordinates, 50);
    console.log("Starting point: ", startingPoint);

    const relevantRoute = Array.from(getRouteEnumerable(startingPoint.waypoint, startingPoint.direction))
      .filter((routePoint): routePoint is Waypoint => routePoint !== undefined)
      .map(routePoint => latLng({lng: routePoint.longitude, lat: routePoint.latitude}));

    const speedMps = (speedKmh * 1000) / 3600

    return interval(intervalMs)
      .pipe(
        map(i => {
          const msPassed = i * intervalMs;
          const metersPassed = msPassed * (speedMps / 1000); // Distance passed in kilometers

          let traveled = 0;
          for (let j = 0; j < relevantRoute.length - 1; j++) {
            const segmentDistance = relevantRoute[j].distanceTo(relevantRoute[j + 1]);
            if (traveled + segmentDistance >= metersPassed) {
              const remainingDistance = metersPassed - traveled;
              const ratio = remainingDistance / segmentDistance;
              const interpolatedLat = relevantRoute[j].lat + ratio * (relevantRoute[j + 1].lat - relevantRoute[j].lat);
              const interpolatedLng = relevantRoute[j].lng + ratio * (relevantRoute[j + 1].lng - relevantRoute[j].lng);

              const jittered = this.addJitter(interpolatedLat, interpolatedLng, 0)

              return {
                timestamp: new Date().getMilliseconds(),
                coords: { latitude: jittered.lat, longitude: jittered.lng, accuracy: 5 }
              } as Position;
            }
            traveled += segmentDistance;
          }
          return {
            timestamp: new Date().getMilliseconds(),
            coords: { latitude: relevantRoute[relevantRoute.length - 1].lat, longitude: relevantRoute[relevantRoute.length - 1].lng, accuracy: 0 }
          } as Position;
        }),
        shareReplay({ refCount: false, bufferSize: 1 })
      )
  }

  private addJitter(lat: number, lng: number, maxJitterMeters: number) {
    const earthRadius = 6371000; // Earth's radius in meters
    const jitterLat = (Math.random() * 2 - 1) * (maxJitterMeters / earthRadius) * (180 / Math.PI);
    const jitterLng = (Math.random() * 2 - 1) * (maxJitterMeters / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

    return { lat: lat + jitterLat, lng: lng + jitterLng };
  }
}
