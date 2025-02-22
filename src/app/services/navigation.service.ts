import { Injectable } from '@angular/core';
import { Position } from '@capacitor/geolocation';
import { combineLatest, distinctUntilChanged, filter, map, Observable, scan, shareReplay, Subject, switchMap, take } from 'rxjs';
import { findOptimalStartingPoint, getRouteEnumerable, routePoints, Waypoint } from '../helpers/routeHelpers';
import { latLng, LatLng } from 'leaflet';

@Injectable({
    providedIn: 'root'
})
export class NavigationService {

    private positionObservable$ = new Subject<Observable<Position | null>>();

    private position$ = this.positionObservable$
        .pipe(
            switchMap((position$) => position$),
            filter((position): position is Position => position !== null),
            filter((position) => position.coords.accuracy < 10),
            shareReplay(1)
        );

    private startingPoint$ = this.position$
        .pipe(
            map(position => this.positionToLatLng(position)),
            map(position => findOptimalStartingPoint(position, 50)),
            take(1)
        );

    private waypointsInReach$ = this.position$
        .pipe(
            map(position => routePoints.filter(rp => rp.latlng.distanceTo(this.positionToLatLng(position)) < 10))
        );

    private visitedWaypoints$ = combineLatest([this.startingPoint$, this.waypointsInReach$])
        .pipe(
            scan((acc, [startingPoint, waypointsInReach]) => {
                let lastRoutePoint = acc.last ?? startingPoint.waypoint;
                const routeEnumerable = getRouteEnumerable(lastRoutePoint, startingPoint.direction);
                routeEnumerable.next();

                if (acc.target === null) {
                    acc.target = routeEnumerable.next().value ?? null;
                }

                if (acc.target === null) {
                    throw new Error('Invariant: Target was not set');
                }

                if (waypointsInReach.includes(acc.target)) {
                    routeEnumerable.next();
                    acc.visited.push(acc.target);
                    acc.last = acc.target;
                    acc.target = routeEnumerable.next().value ?? null;
                }

                return acc;
            }, {visited: [] as Waypoint[], last: null as Waypoint | null, target: null as Waypoint | null})
    );

    constructor() {
        this.visitedWaypoints$.subscribe(console.log);
    }

    public startNavigation(position$: Observable<Position | null>) {
        this.positionObservable$.next(position$);
    }

    private positionToLatLng(position: Position): LatLng {
        return latLng({ lat: position.coords.latitude, lng: position.coords.longitude });
    }

}