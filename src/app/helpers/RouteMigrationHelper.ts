import {geoData} from "../../assets/geodata";

export function insertWaypoint(waypoints: typeof geoData, index: number, waypoint: (typeof geoData)[number]) {
  for (let i = index; i < waypoints.length; i++) {
    waypoints[i].orderIndex = waypoints[i].orderIndex + 1;
  }

  waypoint.orderIndex = index;
  waypoints.push(waypoint);
}

export function deleteWaypoint(waypoints: typeof geoData, waypoint: typeof geoData, index: number) {
  for (let i = index; i < waypoints.length; i++) {
    waypoints[i].orderIndex = waypoints[i].orderIndex - 1;
  }

  waypoints.splice(index, 1);
}
