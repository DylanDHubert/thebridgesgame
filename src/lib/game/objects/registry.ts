import type { TileKind } from "../types";
import {
  OBJECT_DEFINITION_LIST,
  OBJECT_DEFINITIONS,
  objectDefinition,
} from "./objectCatalog";
import {
  ROUTE_DEFINITION_LIST,
  ROUTE_DEFINITIONS,
  routeDefinition,
} from "./routeCatalog";
import type { RouteDefinition, TerrainDefinition } from "./definitionTypes";

export type {
  ObjectCategory,
  ObjectDefinition,
  PlacementRule,
  RouteDefinition,
  TerrainDefinition,
} from "./definitionTypes";

export const TERRAIN_DEFINITIONS: Record<TileKind, TerrainDefinition> = {
  ocean: {
    id: "ocean",
    label: "Water",
    land: false,
    bridgeable: true,
    effects: [{ type: "bridgeCost", cost: 1 }],
  },
  marsh: {
    id: "marsh",
    label: "Marsh",
    land: false,
    bridgeable: true,
    effects: [{ type: "bridgeCost", cost: 2 }],
  },
  grass: {
    id: "grass",
    label: "Grass",
    land: true,
    bridgeable: false,
    effects: [],
  },
  cliff: {
    id: "cliff",
    label: "Cliff",
    land: true,
    bridgeable: false,
    effects: [],
    traversalClass: "cliff",
  },
};

export const TERRAIN_DEFINITION_LIST: TerrainDefinition[] =
  Object.values(TERRAIN_DEFINITIONS);

export function terrainDefinition(kind: TileKind): TerrainDefinition | undefined {
  return TERRAIN_DEFINITIONS[kind];
}

export { OBJECT_DEFINITION_LIST, OBJECT_DEFINITIONS, objectDefinition };
export { ROUTE_DEFINITION_LIST, ROUTE_DEFINITIONS, routeDefinition };
