# `src/lib/game/level` — the canonical map

**What:** `Level` type, file format, serialization, and create-entry terrain generation.

**Why:** one map model for editor, disk, and future play. Replaces the old `Puzzle` + cell `role` fields.

---

## Core type — `Level`

Defined in `types.ts`:

```ts
type Level = {
  id: string;
  name: string;
  seed: string;
  rows: number;
  cols: number;
  terrain: TileKind[];      // row-major, length rows * cols
  objects: LevelObject[];   // buildings, one per cell max
  routes: LevelRoute[];     // player-drawn paths
  mission: Mission;         // { x, y, z } checkpoints
};
```

**Mission** is shown to the player as X → Y → Z. Win logic (in `simulateLevel.ts`) only requires all three to be reachable in one connected walkable component — order does not matter.

---

## Files

| File | Purpose |
|------|---------|
| `types.ts` | `Level`, `LevelFile`, `LevelObject`, `LevelRoute` |
| `serialize.ts` | `serializeLevel` / `deserializeLevel` — **LevelFile v2** |
| `generateLevel.ts` | `/create` entry: noise → terrain → mission → `Level` |
| `gridToLevel.ts` | Tile grid (incl. gen whirlpools) → terrain + objects |

---

## LevelFile v2 (on disk)

- `version: 2`
- `terrain`: encoded string (`o/m/b/g/c` per cell)
- `mission`: `{ x, y, z }` as `[row, col]` pairs
- `objects`: `{ defId, row, col, config? }[]`
- `routes`: `{ id, defId, closed, path: [row,col][], config? }[]`

Saved from the editor via `saveLevelAction(serializeLevel(level))` in `DraftPuzzleView.tsx`.

`public/levels/` is the runtime load path for play (not yet wired).

---

## Generation pipeline (`generateLevel.ts`)

1. `buildRawTerrainGrid` — simplex noise (`terrainNoise.ts`)
2. `buildTileGridFromNoise` — cliffs, marsh, whirlpool **tiles** on gen grid (`terrainFeatures.ts`)
3. `labelLandComponents` — island `componentId` for endpoint picking
4. `pickMissionEndpoints` — three distinct land cells → `mission`
5. `tileGridToLevelParts` — whirlpool tiles become **objects**, not terrain
6. `buildLevel` — assembles final `Level`

Whirlpool on the gen grid is intentional: gen produces objects; playable terrain stays `TileKind` only.

---

## Stubs / extensions

| Need | Where |
|------|-------|
| Play loader | `deserializeLevel` after `fetch('/levels/…')` |
| Validator | script that deserializes + checks bounds/placement |
| Hand-authored levels | edit JSON or use editor; round-trip via serialize |
| Version migration | add `deserializeLevel` branches when bumping `LEVEL_FILE_VERSION` |

---

## Related

- Rules: `../rules.ts`
- Simulation: `../simulateLevel.ts`
- Play list/load: `./listLevels.ts`
- Rendering input: `../../rendering/terrainView.ts` → `terrainViewFromLevel(level)`
