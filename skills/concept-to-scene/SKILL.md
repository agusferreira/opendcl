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

Read the asset catalog: `{baseDir}/../../context/asset-packs-catalog.md` (2,746 Creator Hub models across 12 packs).

Additional catalogs if needed:
- `{baseDir}/../../context/open-source-3d-assets.md` — 991 CC0 models
- `{baseDir}/../../context/audio-catalog.md` — ambient sounds

### Style-First Pack Selection

Before matching individual objects, choose 1-2 **primary asset packs** based on the scene's style:

| Style | Primary Pack | Secondary Pack |
|-------|-------------|----------------|
| Medieval / Fantasy | Fantasy (309) | Western (350) |
| Cyberpunk / Modern | Cyberpunk (338) | Sci-fi (225) |
| Pirate / Nautical | Pirates (197) | Western (350) |
| Western / Rustic | Western (350) | Fantasy (309) |
| Steampunk | Steampunk (71) | Cyberpunk (338) |
| Gallery / Museum | Gallery (516) | Genesis City (233) |
| Mixed / Hybrid | Pick 2 based on vibe | — |

**Style coherence rule**: ≥70% of assets should come from primary pack. Cross-pack only when primary lacks a category (e.g., Western has no arcade machines → use Cyberpunk).

### Matching Process

For each object in the positioned graph:

1. **Search by `search_terms`** — grep the catalog for matching filenames and tags
2. **Prefer primary pack** — always check primary pack first
3. **Record exact filename** — the catalog shows the actual `.glb` filename. Use it exactly.
4. **Note the download URL** — each entry has a `curl` command with the IPFS URL

### ⚠️ Filename Gotchas

The catalog has **two filename conventions**:
- **Cyberpunk/Sci-fi/Gallery/Pirates/Fantasy**: underscores, sometimes subdirectories (e.g., `Arcade_Machine_Black.glb`, `Bottle_06/Bottle_06.glb`, `Chandelier_02/Chandelier_02.glb`)
- **Western/Steampunk**: spaces in filenames (e.g., `Bar Stool.glb`, `Furnit Bar 2 3M.glb`, `Light Wheel.glb`)

**Always use the exact filename from the catalog's "Filename" column.** Do not convert spaces to underscores or vice versa.

When referencing in `GltfContainer.create()`, use the filename as-is:
```typescript
place('models/Bar Stool.glb', ...)      // Western - spaces OK
place('models/Arcade_Machine_Black.glb', ...) // Cyberpunk - underscores
```

### Fallback: Primitives

If no asset matches (<10% of entities), use PBR boxes/cylinders:
```typescript
function box(pos, scale, color) {
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(...pos), scale: Vector3.create(...scale) })
  MeshRenderer.setBox(e)
  Material.setPbrMaterial(e, { albedoColor: Color4.create(...color) })
  return e
}
```

Use primitives for: walls, floor, ceiling, simple shelves. Never for furniture or decorations.

### Asset Map Output

Build a mapping table before generating code:

```
# Asset Map — Fourth & Goal Sports Bar (cyberpunk modern western)
# Primary: Cyberpunk (338) | Secondary: Western (350)

bar_counter     → "Furnit Bar 2 3M.glb" (Western)     https://builder-items...bafkrei...
bar_counter_ext → "Furnit Bar 1 2M.glb" (Western)     https://builder-items...bafkrei...
bar_stool       → "Bar Stool.glb" (Cyberpunk)         https://builder-items...bafkrei...
arcade_machine  → "Arcade_Machine_Black.glb" (Cyber)  https://builder-items...bafybei...
neon_sign       → "Neon_Hanging_Sign.glb" (Cyberpunk)  https://builder-items...bafybei...
```

---

## Stage 4: Generate Code

### Step 1: Download ALL assets

Generate a download script from the asset map. Download everything before writing code.

```bash
#!/bin/bash
cd "$(dirname "$0")/models"

dl() {
  local file="$1" url="$2"
  [ -f "$file" ] && echo "SKIP $file" && return
  echo "GET  $file"
  curl -sL -o "$file" "$url"
}

dl "Furnit Bar 2 3M.glb" "https://builder-items.decentraland.org/contents/bafkrei..."
dl "Bar Stool.glb" "https://builder-items.decentraland.org/contents/bafkrei..."
# ... all assets

echo "Downloaded: $(ls *.glb 2>/dev/null | wc -l) models"
```

Save as `download-models.sh` in the scene root and run it.

### Step 2: Scaffold the scene (if needed)

```bash
# package.json
{
  "name": "scene-name",
  "dependencies": { "@dcl/sdk": "latest" },
  "scripts": { "start": "sdk-commands start" }
}

# scene.json
{
  "ecs7": true, "runtimeVersion": "7",
  "display": { "title": "Scene Name" },
  "scene": { "parcels": ["0,0"], "base": "0,0" },
  "main": "bin/index.js"
}
```

Then `npm install`.

### Step 3: Generate index.ts

Use the positioned graph's `resolved` array for exact coordinates. Structure:

```typescript
import { engine, Transform, GltfContainer, MeshRenderer, MeshCollider, Material } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'

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

function box(pos: [number,number,number], scale: [number,number,number],
             color: [number,number,number,number]) {
  const e = engine.addEntity()
  Transform.create(e, { position: Vector3.create(...pos), scale: Vector3.create(...scale) })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, { albedoColor: Color4.create(...color) })
  return e
}

export function main() {
  // === STRUCTURE (primitives) ===
  box([8, 0, 8], [16, 0.1, 16], [0.15, 0.1, 0.08, 1])  // floor
  // walls, ceiling...

  // === ZONE: Entrance ===
  place('models/Door 5.glb', [8, 0, 0.3])
  // ... all entrance objects with EXACT positions from resolver

  // === ZONE: Main Area ===
  // ... grouped by zone, using resolved coordinates

  console.log('Scene loaded')
}
```

### Critical rules

1. **Use EXACT positions from the resolver output.** Do not round, adjust, or "improve" them.
2. **Generate ALL entities in one pass.** Never stop at 10 and ask "continue?"
3. **Group by zone** in comments.
4. **Match the entity count.** If the resolver says 61 entities, the code has 61 `place()` calls.
5. **Use walls/floor/ceiling as primitives.** They don't need GLB assets.

---

## Stage 5: Verify

Run the DCL preview:
```bash
cd scene-dir && npx @dcl/sdk-commands start --port 8500
```

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
