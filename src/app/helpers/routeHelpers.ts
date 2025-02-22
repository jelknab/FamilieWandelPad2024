import { latLng, LatLng } from 'leaflet';
import { geoData } from 'src/assets/geodata';

export type Waypoint = typeof routePoints[number];
export type Direction = 'forward' | 'backward';

export const routePoints = geoData
  .filter(rp => rp.routeId === 1)
  .sort((a, b) => b.orderIndex - a.orderIndex)
  .map(point => {
    return {
      ...point,
      latlng: latLng({lat: point.latitude, lng: point.longitude})
    }
  });

export const sections = geoData
  .map(dataPoint => dataPoint.sectionId)
  .filter((sectionId): sectionId is number => sectionId !== null)
  .reduce((acc, sectionId) => !acc.includes(sectionId) ? [...acc, sectionId] : acc, [] as number[])
  .map(sectionId => {
    return {
      sectionPoints: geoData
        .filter(d => d.sectionId === sectionId)
        .sort((a, b) => b.orderIndex - a.orderIndex)
        .map(point => {
          return {
            ...point,
            latlng: latLng({lat: point.latitude, lng: point.longitude})
          }
        })
    }
  });

export function* getRouteEnumerable(startingPoint: Waypoint, direction: Direction) {
    var index = routePoints.indexOf(startingPoint);

    do {
        yield routePoints.at(index);

        index = (direction === 'forward' ? index + 1 : index - 1) % routePoints.length;

        if (routePoints.at(index) === startingPoint) {
            return;
        }
    } while (routePoints.at(index) !== startingPoint);
}

export function getSection(position: LatLng) {
    return sections.find((section) => {
        const poligonPoints = section.sectionPoints.map(sp => sp.latlng);

        const x = position.lat;
        const y = position.lng;

        let inside = false;

        for (var i = 0, j = poligonPoints.length - 1; i < poligonPoints.length; j = i++) {
            const xi = poligonPoints[i].lat;
            const yi = poligonPoints[i].lng;

            const xj = poligonPoints[j].lat;
            const yj = poligonPoints[j].lng;

            const intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) {
                inside = !inside;
            }
        }

        return inside;
    }) ?? null;
}

export function getDistanceInSection(waypoint: Waypoint, direction: Direction) {
    const section = getSection(waypoint.latlng);
    
    if (section === null) {
        return {distance: 0, lastWp: waypoint};
    }

    const route = Array.from(getRouteEnumerable(waypoint, direction));

    return route
        .filter((wp): wp is Waypoint => wp !== undefined)
        .filter((wp) => getSection(wp.latlng) === section)
        .reduce((acc, wp) => {
            return {
                distance: acc.distance + wp.latlng.distanceTo(acc.lastWp.latlng),
                lastWp: wp
            }
        }, {distance: 0, lastWp: waypoint});
}

export function findOptimalStartingPoint(position: LatLng, searchRangeMeters: number) {
    const waypointsByDistance = routePoints
        .filter(point => point.type === 'WayPoint' || point.type === 'PointOfInterest')
        .sort((a, b) => a.latlng.distanceTo(position) - b.latlng.distanceTo(position));

    const closestWaypoint = waypointsByDistance[0];
    const waypointsWithinRange = waypointsByDistance.filter(wp => wp.latlng.distanceTo(closestWaypoint.latlng) < searchRangeMeters);

    const potentialWaypoints = [closestWaypoint, ...waypointsWithinRange];

    const waypointSectionDistances = potentialWaypoints
        .map(wp => {
            return {
                waypoint: wp,
                distances: {
                    forward: getDistanceInSection(wp, 'forward'),
                    backward: getDistanceInSection(wp, 'backward')
                }
             }
        });

    const preferredStartingPoint = waypointSectionDistances
        .sort((a, b) => Math.max(a.distances.forward.distance, a.distances.backward.distance) - Math.max(b.distances.forward.distance, b.distances.backward.distance))
        .at(-1);

    if (preferredStartingPoint === undefined) {
        return {
            waypoint: closestWaypoint,
            direction: 'forward' as Direction
        }
    }

    const waypoint = preferredStartingPoint.waypoint;
    let direction = 'forward' as Direction;

    if (preferredStartingPoint.distances.backward.distance > preferredStartingPoint.distances.forward.distance) {
        direction = 'backward' as Direction;
    }

    return {
        waypoint,
        direction: direction as Direction
    };
}