# `src/lib/rendering` — visuals decoupled from play state

**What:** canvas/SVG drawing helpers that only need terrain shape + seed, not bridges or game phase.

**Why:** create editor and future play share the same board look. Play-specific overlays (bridges, mission markers, ships) sit in `src/components/game/`.

---

## Key abstraction — `TerrainView`

`terrainView.ts`:

```ts
type TerrainView = {
  seed: string;
  rows: number;
  cols: number;
  terrain: readonly TileKind[];
};
```

Build from a full level:

```ts
terrainViewFromLevel(level)
```

Use `terrainKindAt(view, row, col)` for lookups.

**Do not** pass full `Level` into low-level terrain painters unless you need objects/routes — keeps rendering usable for thumbnails and gen preview.

---

## Module map

| Area | Files | Notes |
|------|-------|-------|
| Terrain appearance | `cellAppearance.ts`, `terrain.ts` | colors, marsh splotches, cliffs |
| Flat thumbnails | `flatTerrain.ts` | per-cell colors for level picker (no noise) |
| Ambient chrome | `ambientGrid.ts` | shared cell/gap layout (header bands) |
| Water animation | `waterNoise.ts`, `waterFeatures.ts` | subcell noise; no whirlpool terrain kind |
| Bridges | `bridgeWood.ts` | bridge planks on water cells |
| Borders | `terrainBorders.ts`, `TerrainBorderOverlay` | coast outlines |
| Objects on canvas | object render keys from catalog | whirlpool swirl, etc. |
| Routes | Catmull-Rom paths, `RouteShipOverlay` | ships follow route geometry |

---

## Components vs lib

| Layer | Location |
|-------|----------|
| React board shell | `src/components/game/GameBoard.tsx` |
| Mission X/Y/Z | `MissionMarkerOverlay.tsx` |
| Pure draw functions | `src/lib/rendering/*.ts` |

`GameBoard` takes `level: Level` and derives `TerrainView` internally for terrain layers.

---

## Migration note

Legacy code referenced `Puzzle` / `view.cells`. All terrain drawing should use `view.terrain` + `TerrainView`. Whirlpool visuals come from **objects** on the level, not a terrain kind.

---

## Stubs

- Route ships render; pirate/merchant **gameplay** effects are not wired.
- Object `render` keys without a renderer fall back to generic placeholders (check swatch components).
