# `src/lib/game` — core game logic

**What:** deterministic rules, level model, terrain generation for create, and play simulation API.

**Why:** one place for map data and gameplay rules. UI (`GameBoard`, editor) imports from here; no parallel `Puzzle` / PAR stack.

---

## Layout

| Path | Role |
|------|------|
| `types.ts` | `TileKind`, `Mission`, `SimulationResult`, `GamePhase` |
| `level/` | **`Level`** model, serialize, create-time generation — see [level/README.md](./level/README.md) |
| `objects/` | JSON catalogs, effect resolution, terrain/object defs — see [objects/README.md](./objects/README.md) |
| `rules.ts` | **Single rules engine:** bridge placement, costs, walkability, traversal |
| `simulateLevel.ts` | Play submit / win check (order-agnostic mission) — **no PAR** |
| `terrainNoise.ts` | Raw noise grid for create entry |
| `terrainFeatures.ts` | Marsh/cliff/whirlpool placement on gen grid; land labeling |
| `endpoints.ts` | `pickMissionEndpoints` → X/Y/Z on land |
| `createConfig.ts` | Normalized config for `/create` generation |
| `generationConfig.ts` | Grid size limits shared with create |
| `tiles.ts` | **Deprecated** re-exports from `rules.ts` — do not add logic here |
| `coords.ts`, `constants.ts`, `seed.ts` | Shared utilities |

---

## Data flow

### Create

```
/create/view?seed=…
  → generateLevel(seed)
  → Level (terrain + mission + optional gen objects)
  → DraftPuzzleView editor
  → serializeLevel → public/levels/*.json
```

### Home

```
/
  → loadSavedLevel("home")  // public/levels/home.json
  → homeMapFromLevel (X=HOME Y=PLAY Z=CREATE land components)
  → GameBoard + bridges → /play or /create

Edit: /create/view?level=home → DraftPuzzleView → Save home map
```

### Play

```
/play
  → listSavedLevels (public/levels/)
  → picker + LevelMiniMap
/play?level=id
  → loadSavedLevel
  → GameBoard + useLevelGame (bridges)
  → Check → simulateLevel → success (cost) or disconnected
```

---

## Stubs / tickets

| Ticket | Hook |
|--------|------|
| Drag bridges | `GameBoard` pointer layer + `canPlaceBridgeAt` |
| Level validator | `scripts/validateLevels.ts` + `deserializeLevel` |
| Custom gameplay | `objects/effectHandlers.ts` — `lighthouseLight`, `port` |
| Animals | not on `Level`; future runtime module |

---

## Removed (do not resurrect)

- `Puzzle`, `PuzzleGrid`, `parCost`
- `par.ts`, `simulation.ts`, `solvePuzzle.ts`, `generation.ts` (procedural play)
- `useBridgeGame`, `generatePuzzleAction`

Win condition is **mission connectivity**, not minimum bridge cost.
