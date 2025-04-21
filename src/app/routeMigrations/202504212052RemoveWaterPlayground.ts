import {routePoints} from "../helpers/routeHelpers";

export function removeWaterPlayground(route: typeof routePoints): typeof routePoints {
  const originalPoint = route.find(point => point.id === 85);

  if (originalPoint !== undefined) {
    originalPoint.type = 'WayPoint';
  }

  return route;
}
