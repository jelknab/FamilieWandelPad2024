import { latLng } from 'leaflet';
import {routePoints} from "../helpers/routeHelpers";

export function updateLaughingMirrors(route: typeof routePoints): typeof routePoints {
  const newId = route.reduce((max, point) => Math.max(max, point.id), 0) + 1;

  const originalPoint = route.find(point => point.id === 32);

  const newPoint = {
    type: "PointOfInterest",
    routeId: 1,
    id: newId,
    orderIndex: 36,
    latitude: 52.21728022261119,
    longitude: 4.561327099800111,
    sectionId: null,
    latlng: latLng(52.21728022261119, 4.561327099800111),
    translations: originalPoint?.translations
  } as (typeof routePoints)[number];

  for (let point of route) {
    if (point.orderIndex >= 36) {
      point.orderIndex = point.orderIndex + 1;
    }
  }

  route.push(newPoint);

  const sortIdsToRemove = [92, 93, 94, 95];

  for (let id of sortIdsToRemove) {
    const index = route.findIndex(point => point.orderIndex === id);
    route.splice(index, 1);
  }

  for (let point of route) {
    if (point.orderIndex >= 92) {
      point.orderIndex = point.orderIndex - 1;
    }
  }

  return route;
}
