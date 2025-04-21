
import {routePoints} from "../helpers/routeHelpers";
import {updateLaughingMirrors} from "./202504212016UpdateLaughingMirrors";
import {removeOldStart} from "./202504212017RemoveOldStart";
import {moveBikeFerry} from "./202504212029MoveBikeFerry";
import {removeWaterPlayground} from "./202504212052RemoveWaterPlayground";


let migrations: ((route: typeof routePoints) => typeof routePoints)[] = [
  updateLaughingMirrors,
  removeOldStart,
  moveBikeFerry,
  removeWaterPlayground
];

export function updatedRoute(initialSections: typeof routePoints) {
  let route = initialSections;

  for (let migration of migrations) {
    route = migration(route);
  }

  return route;
}
