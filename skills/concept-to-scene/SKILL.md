---
name: concept-to-scene
description: Build a dense, spatially coherent Decentraland SDK7 scene from a text description or reference images. Uses a 5-stage pipeline — Scene Graph → Layout Resolver → Asset Matching → Code Generation → Verification. The LLM generates spatial relationships (not coordinates), and a deterministic resolver computes absolute positions. Use when the user wants to build a complete scene (tavern, gallery, arena, etc.) from a description or visual reference.
---

# Concept to Scene

Build production-quality Decentraland scenes using a structured pipeline. The key insight: **you generate relationships, a script generates coordinates.**

## Pipeline

```
Text/Images → Scene Graph → Layout Resolver → Asset Match → Code → Verify
                (you)          (script)         (you)       (you)  (you)
```

---

## Stage 1: Generate Scene Graph

Read the schema: `{baseDir}/references/scene-graph-schema.md`
Read few-shot examples: `{baseDir}/references/few-shot-tavern.json` and `{baseDir}/references/few-shot-gallery.json`

From the user's description (or image analysis), produce a **scene graph JSON**. This describes WHAT objects exist and HOW they relate spatially — **never generate absolute coordinates.**

### Rules

1. **Use the placement vocabulary.** Every object gets a placement type from the closed set: `AGAINST_WALL`, `IN_CORNER`, `IN_ZONE`, `FACING`, `AROUND`, `ABOVE`, `ON_WALL`, `NEXT_TO`, `ON_TOP`, `REPEAT_ALONG`, `CLUSTER`. Never invent positions like `"position": [4, 0, 7]`.

2. **Think in zones.** Divide the scene into rectangular zones (entrance, main area, back area, corners). Every object belongs to a zone.

3. **Minimum 30 objects** for a 1-parcel interior. If you have fewer, add scatter props (mugs, candles, books, rugs) and wall decorations (paintings, torches, shelves).

4. **Three vertical layers per zone.** Floor items (y<0.5), eye-level items (y 0.5-2.5), and overhead items (y>2.5). If a zone only has floor items, add wall-mounted or ceiling elements.

5. **No empty corners.** Every scene corner (NW, NE, SW, SE) gets at least 1 object.

6. **No bare walls.** Every 4m of wall needs at least one mounted item (painting, torch, shelf, window).

7. **Mark focal points.** At least 1 object has `role: "FOCAL_POINT"`. This is the first thing the player sees from spawn.

### Process

1. Analyze the user's request (text description or reference images)
2. Define zones (passage, open_area, counter_area, corner, etc.)
3. List all objects with placement relationships
4. Ensure density requirements are met
5. Present the scene graph to the user for approval
6. Save as a temporary JSON file (e.g., `/tmp/scene-graph.json`)

---

## Stage 2: Run Layout Resolver

The resolver is a deterministic script that converts your scene graph into absolute coordinates. **Do not skip this step.**

```bash
npx tsx {baseDir}/../../scripts/resolve-layout.ts /tmp/scene-graph.json > /tmp/positioned-graph.json
```

The resolver:
- Assigns zone bounds based on parcel dimensions
- Resolves objects in dependency order (table before chairs-around-table)
- Computes absolute (x, y, z) and rotation for every instance
- Checks for collisions
- Reports warnings to stderr, outputs positioned JSON to stdout

**Check stderr output.** If there are collision warnings for floor-level furniture, adjust the scene graph and re-run.

After resolving, read `/tmp/positioned-graph.json` — every object now has a `resolved` array with `position`, `rotation`, and `scale` for each instance.

---

## Stage 3: Match Assets

Read both asset catalogs:
1. `{baseDir}/../../context/asset-packs-catalog.md` — 2,746 Creator Hub models
2. `{baseDir}/../../context/open-source-3d-assets.md` — 991 CC0 models
3. `{baseDir}/../../context/audio-catalog.md` — ambient sounds

For each object in the positioned graph:
1. Use `search_terms` to find matching assets by name and tags
2. **Style coherence**: once the first few assets come from a pack (e.g., "Western"), prefer that pack for remaining objects
3. **Fallback**: if no asset matches, use a primitive (MeshRenderer.setBox + PbrMaterial) — max 10% of entities

Record the asset mapping:
```
bar_counter → Bar_Wood.glb (Western pack)
stool → Stool_01.glb (Western pack)
fireplace → Fireplace_Stone.glb (Fantasy pack)
```

---

## Stage 4: Generate Code

### Setup first

1. Run `/init` if the scene isn't scaffolded yet
2. Download ALL matched assets before writing code:
```bash
mkdir -p models
curl -o models/Bar_Wood.glb "https://builder-items..."
curl -o models/Stool_01.glb "https://builder-items..."
# ... all assets at once
```

### Generate index.ts

Use the positioned graph to generate the complete scene. Every object's `resolved` array has exact coordinates.

```typescript
import { engine, Transform, GltfContainer, LightSource, LightSourceType } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color3 } from '@dcl/sdk/math'

function place(src: string, pos: [number,number,number],
               rot?: [number,number,number], scale?: [number,number,number]) {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(...pos),
    rotation: rot ? Quaternion.fromEulerDegrees(...rot) : undefined,
    scale: scale ? Vector3.create(...scale) : undefined
  })
  GltfContainer.create(e, { src })
  return e
}

function addLight(pos: [number,number,number], color: Color3, intensity: number) {
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(...pos) })
  LightSource.create(e, { type: LightSourceType.LST_POINT, color, intensity, range: intensity / 20 })
}

export function main() {
  // === ZONE: Entrance ===
  place('models/Door.glb', [8, 0, 0.3], [0, 0, 0])
  // ... all entrance objects with EXACT positions from resolver

  // === ZONE: Main Hall ===
  place('models/Table_Round.glb', [4.23, 0, 7.15])
  place('models/Chair.glb', [3.83, 0, 7.15], [0, 90, 0])
  // ... all objects from resolver

  // === LIGHTING ===
  addLight([8, 3, 14], Color3.create(1, 0.8, 0.5), 250)
  // ...
}
```

### Critical rules

1. **Use the EXACT positions from the resolver output.** Do not round, adjust, or "improve" them.
2. **Generate ALL entities in one pass.** Never stop at 10 and ask "continue?"
3. **Group by zone** in comments.
4. **Match the entity count.** If the resolver says 61 entities, the code has 61 `place()` calls.

---

## Stage 5: Verify

After code generation:

1. Wait for hot-reload (~2-3s)
2. Screenshot from spawn (south, facing north)
3. Evaluate:
   - Is the focal point visible?
   - Does density feel right (not empty, not cluttered)?
   - Are orientations correct (chairs face tables)?
   - Does lighting create atmosphere?
4. Move to each zone, screenshot, evaluate
5. Fix zone by zone if needed (max 3 iterations)

### Checklist

- [ ] ≥30 entities visible
- [ ] No large empty areas (>4m²)
- [ ] Focal point visible from spawn
- [ ] Walls decorated
- [ ] Vertical variety (floor + eye + ceiling items)
- [ ] Lighting creates mood
- [ ] No floating or underground objects
- [ ] Scene compiles without errors

---

## Quick Reference

Read placement rules: `{baseDir}/references/placement-rules.md`

| Placement | What it does |
|-----------|-------------|
| AGAINST_WALL | Flush against wall, face inward |
| IN_CORNER | In a corner, face center |
| IN_ZONE | Open position in zone bounds |
| FACING | Face a target object |
| AROUND | Circle around a target |
| ABOVE | Suspended above a target |
| ON_WALL | Mounted on wall surface |
| NEXT_TO | Adjacent to a target |
| ON_TOP | On the surface of a target |
| REPEAT_ALONG | Repeated along a wall |
| CLUSTER | Loosely grouped together |
