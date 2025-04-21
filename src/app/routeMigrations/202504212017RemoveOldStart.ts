import {routePoints} from "../helpers/routeHelpers";

export function removeOldStart(route: typeof routePoints): typeof routePoints {
  const sortIdsToRemove = [0, 1, 159, 158, 160];

  for (let id of sortIdsToRemove) {
    const index = route.findIndex(point => point.orderIndex === id);
    route.splice(index, 1);
  }

  for (let point of route) {
    point.orderIndex = point.orderIndex - 2;
  }

  return route;
}
