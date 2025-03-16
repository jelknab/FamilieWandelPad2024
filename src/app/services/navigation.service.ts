import {Injectable} from '@angular/core';
import {Position} from '@capacitor/geolocation';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  scan, share,
  shareReplay,
  Subject,
  switchMap,
  take
} from 'rxjs';
import {findOptimalStartingPoint, getRouteEnumerable, routePoints, Waypoint} from '../helpers/routeHelpers';
import {latLng, LatLng} from 'leaflet';
import {calendarClearOutline} from "ionicons/icons";

const WAYPOINT_ACTIVATION_DISTANCE_METERS = 5;
const STARTING_POINT_SEARCH_DISTANCE = 50;

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private positionObservable$ = new Subject<Observable<Position | null>>();

  public position$ = this.positionObservable$
    .pipe(
      switchMap((position$) => position$),
      filter((position): position is Position => position !== null),
      filter((position) => position.coords.accuracy < WAYPOINT_ACTIVATION_DISTANCE_METERS),
      shareReplay(1)
    );

  private startingPoint$ = this.position$
    .pipe(
      map(position => this.positionToLatLng(position)),
      map(position => findOptimalStartingPoint(position, STARTING_POINT_SEARCH_DISTANCE)),
      take(1)
    );

  private waypointsInReach$ = this.position$
    .pipe(
      map(position => routePoints.filter(rp => rp.latlng.distanceTo(this.positionToLatLng(position)) < WAYPOINT_ACTIVATION_DISTANCE_METERS))
    );

  public visitedWaypoints$ = combineLatest([this.startingPoint$, this.waypointsInReach$])
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
      }, {
        visited: [] as Waypoint[],
        last: null as Waypoint | null,
        target: null as Waypoint | null
      }),
      share()
    );

  public walkedRoute$: Observable<LatLng[]> = combineLatest([this.visitedWaypoints$, this.position$]).pipe(
    map(([visitedWaypoints, position]) => {
      const {visited, last, target} = visitedWaypoints;

      // Convert all visited waypoints to LatLng for the route
      const route: LatLng[] = visited.map(waypoint => waypoint.latlng);

      // If we have a 'last' and 'target', calculate the closest point
      if (visited.length > 1 && last && target) {
        const currentLatLng = this.positionToLatLng(position);

        const linePoints = [
          visited.at(-2)!.latlng,
          visited.at(-1)!.latlng,
          target.latlng
        ];

        const closestPoint = this.getClosestPointOnLineSegment(linePoints, currentLatLng);

        // Closest point on line segment from `last` to `target`
        // const closestPoint = this.getClosestPointOnSegment(
        //   last.latlng,
        //   target.latlng,
        //   currentLatLng
        // );

        const distanceToLastPoint = last.latlng.distanceTo(currentLatLng);

        if (distanceToLastPoint > WAYPOINT_ACTIVATION_DISTANCE_METERS) {
          return [...route, closestPoint];
        }

        // Add the interpolated point to the route
        // route.push(closestPoint);
        return [...route.slice(0, -1), closestPoint];
      }

      return route;
    }),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)), // Prevent emitting if the route hasn't changed
    shareReplay(1) // Replay the latest walked route to late subscribers
  );


  constructor() {
    this.visitedWaypoints$.subscribe(console.log);
  }

  public startNavigation(position$: Observable<Position | null>) {
    this.positionObservable$.next(position$);
  }

  private positionToLatLng(position: Position): LatLng {
    return latLng({lat: position.coords.latitude, lng: position.coords.longitude});
  }

  private getClosestPointOnSegment(start: LatLng, end: LatLng, position: LatLng): LatLng {
    const startToPos = this.subtract(position, start);
    const startToEnd = this.subtract(end, start);

    const startToEndLengthSquared = this.dotProduct(startToEnd, startToEnd);
    if (startToEndLengthSquared === 0) return start; // Handle edge case: `start` and `end` are the same

    const projection = this.dotProduct(startToPos, startToEnd) / startToEndLengthSquared;

    // Clamp projection to [0,1] to ensure point lies on the segment
    const t = Math.max(0, Math.min(1, projection));

    // Interpolated point on the segment
    return latLng({
      lat: start.lat + t * (end.lat - start.lat),
      lng: start.lng + t * (end.lng - start.lng)
    });
  }

  private getClosestPointOnLineSegment(
    points: LatLng[],
    position: LatLng
  ): LatLng {
    if (points.length < 2) {
      throw new Error('At least two points are required to form a line segment.');
    }

    let closestPoint: LatLng | null = null;
    let minDistance = Infinity;

    // Iterate over each segment formed by consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const segmentStart = points[i];
      const segmentEnd = points[i + 1];

      // Find the closest point on the current segment
      const candidatePoint = this.getClosestPointOnSegment(segmentStart, segmentEnd, position);
      const candidateDistance = position.distanceTo(candidatePoint);

      // Update the closest point if this one is closer than any previously found
      if (candidateDistance < minDistance) {
        closestPoint = candidatePoint;
        minDistance = candidateDistance;
      }
    }

    // Ensure we return a valid LatLng closest point
    if (!closestPoint) {
      throw new Error('No closest point found on the line segments.');
    }

    return closestPoint;
  }

  // Helper functions for vector math
  private subtract(a: LatLng, b: LatLng): { lat: number; lng: number } {
    return {lat: a.lat - b.lat, lng: a.lng - b.lng};
  }

  private dotProduct(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    return a.lat * b.lat + a.lng * b.lng;
  }


}
