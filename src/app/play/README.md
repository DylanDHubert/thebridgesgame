# `src/app/play` — play mode

**What:** load saved levels, place bridges, succeed when mission checkpoints connect.

**Why:** create + save ship first; play reuses `Level` + `GameBoard` with no PAR / solver.

---

## Flow

```
/play                  → level picker (mini maps from public/levels/)
/play?level={id}       → PlaySession + useLevelGame
                       → toggle bridges → Check → simulateLevel
                       → success shows weighted bridge cost
```

---

## Modules

| Concern | Where |
|---------|--------|
| List / load disk | `@/lib/game/level/listLevels` |
| Win + cost | `@/lib/game/simulateLevel` |
| Session state | `@/hooks/useLevelGame` |
| Mini map | `@/components/play/LevelMiniMap` |
| Picker / session | `@/components/play/LevelPicker`, `PlaySession` |
| Board | `@/components/game/GameBoard` |

---

## Win rule

All mission checkpoints `x`, `y`, `z` reachable from each other via land + bridges. **Order does not matter.** Score is **bridge cost** only (marsh weighted).

---

## Not in scope

- PAR / optimal display
- Animals / lighthouse / port gameplay
- Procedural play generation
