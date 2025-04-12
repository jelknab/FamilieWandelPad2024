import {updateLaughingMirrors} from "./UpdateLaughingMirrors";


let migrations: (() => void)[] = [
  updateLaughingMirrors
];

export function updateRoute() {
  for (let migration of migrations) {
    migration();
  }
}
