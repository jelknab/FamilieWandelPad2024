import {routePoints} from "../helpers/routeHelpers";
import {latLng} from "leaflet";

export function moveBikeFerry(route: typeof routePoints): typeof routePoints {
  const newId = route.reduce((max, point) => Math.max(max, point.id), 0) + 1;

  const originalPoint = route.find(point => point.id === 26);

  if (originalPoint !== undefined) {
    originalPoint.type = 'WayPoint';
  }

  const newPoint = {
    type: "PointOfInterest",
    routeId: 1,
    id: newId,
    orderIndex: 133,
    latitude: 52.21640433211277,
    longitude: 4.55809772014618,
    sectionId: null,
    latlng: latLng(52.21640433211277, 4.55809772014618),
    translations: originalPoint?.translations
  } as (typeof routePoints)[number];

  for (let point of route) {
    if (point.orderIndex >= 74) {
      point.orderIndex = point.orderIndex + 1;
    }
  }

  route.push(newPoint);

  return route;
}
