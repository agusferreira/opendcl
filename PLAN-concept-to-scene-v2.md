# OpenDCL Concept-to-Scene v2 — Implementation Plan

## Problem Statement

Given a text description (or optional reference images), generate a Decentraland SDK7 scene that is **spatially coherent, dense (30-60+ entities), and production-quality** — using only pre-existing 3D assets from the Creator Hub (2,746 models) and CC0 (991 models) catalogs.

Current state: the LLM generates 5-10 entities with random coordinates. Scenes feel empty and spatially incoherent. Direct image-to-scene fails because LLMs cannot reason about 3D space from 2D images.

## Architecture

```
User Input (text + optional images)
  │
  ▼
┌─────────────────────────────┐
│  STAGE 1: Scene Graph       │  LLM generates semantic relationships
│  (what goes where, relative)│  Output: JSON graph of objects + relations
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  STAGE 2: Layout Resolver   │  Deterministic script converts relations → coordinates
│  (absolute positioning)     │  Applies placement rules + collision avoidance
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  STAGE 3: Asset Matcher     │  LLM searches catalogs per object
│  (find real .glb models)    │  Falls back to primitives only if no match
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  STAGE 4: Code Generator    │  Produces complete index.ts
│  (SDK7 TypeScript)          │  Downloads assets, generates all entities
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│  STAGE 5: Verify + Iterate  │  Screenshot → compare → fix per zone
│  (visual QA loop)           │  Human approves or requests changes
└─────────────────────────────┘
```

**Key insight**: Stage 1 and Stage 2 are separated. The LLM never generates absolute coordinates. It generates *relationships*. A deterministic resolver converts relationships to coordinates using physics-aware rules. This plays to each system's strengths.

---

## Stage 1: Scene Graph Generation

### What the LLM produces

The LLM generates a **scene graph** — a JSON structure describing objects and their spatial relationships. No absolute coordinates. No pixel positions. Just semantic layout.

```json
{
  "scene": {
    "name": "Medieval Tavern",
    "type": "interior",
    "parcels": [1, 1],
    "style": "medieval fantasy",
    "zones": [
      {
        "id": "entrance",
        "type": "passage",
        "wall": "south",
        "width": 4,
        "depth": 3,
        "description": "Main entrance with double doors"
      },
      {
        "id": "main_hall",
        "type": "open_area",
        "position": "center",
        "description": "Central gathering area with tables"
      },
      {
        "id": "bar",
        "type": "counter_area",
        "wall": "north",
        "width": 10,
        "depth": 3,
        "description": "Long bar counter with shelving behind"
      }
    ],
    "objects": [
      {
        "id": "bar_counter",
        "type": "furniture",
        "search_terms": ["bar", "counter", "wooden"],
        "zone": "bar",
        "placement": "AGAINST_WALL",
        "wall": "north",
        "role": "FOCAL_POINT"
      },
      {
        "id": "stool_group_1",
        "type": "seating",
        "search_terms": ["stool", "bar stool", "wooden"],
        "zone": "bar",
        "placement": "FACING",
        "facing": "bar_counter",
        "spacing": 1.2,
        "count": 4
      },
      {
        "id": "table_1",
        "type": "furniture",
        "search_terms": ["table", "round", "wooden", "tavern"],
        "zone": "main_hall",
        "placement": "IN_ZONE",
        "min_distance_from_walls": 2.0
      },
      {
        "id": "chairs_table_1",
        "type": "seating",
        "search_terms": ["chair", "wooden", "medieval"],
        "placement": "AROUND",
        "around": "table_1",
        "count": 4,
        "distance": 0.4,
        "facing": "table_1"
      },
      {
        "id": "fireplace",
        "type": "fixture",
        "search_terms": ["fireplace", "stone", "medieval"],
        "zone": "main_hall",
        "placement": "AGAINST_WALL",
        "wall": "east",
        "role": "SECONDARY_FOCAL"
      },
      {
        "id": "chandelier_1",
        "type": "lighting",
        "search_terms": ["chandelier", "medieval", "candle"],
        "placement": "ABOVE",
        "above": "table_1",
        "height": 3.5
      },
      {
        "id": "barrels_corner",
        "type": "decoration",
        "search_terms": ["barrel", "wooden", "medieval"],
        "placement": "IN_CORNER",
        "corner": "NW",
        "count": 3,
        "arrangement": "cluster"
      },
      {
        "id": "wall_torch_1",
        "type": "lighting",
        "search_terms": ["torch", "wall", "medieval", "sconce"],
        "placement": "ON_WALL",
        "wall": "west",
        "height": 2.2,
        "repeat": { "count": 3, "spacing": 4.0 }
      }
    ],
    "lighting": {
      "mood": "warm",
      "time": "evening",
      "ambient_intensity": 0.3,
      "key_lights": [
        { "near": "fireplace", "color": [1.0, 0.6, 0.2], "intensity": 400 },
        { "near": "bar_counter", "color": [1.0, 0.8, 0.5], "intensity": 200 }
      ]
    }
  }
}
```

### Placement vocabulary (finite set of relations)

The LLM picks from a **closed set** of placement types. It never invents coordinates.

| Placement | Meaning | Parameters |
|-----------|---------|------------|
| `AGAINST_WALL` | Flush against specified wall | `wall`: north/south/east/west |
| `IN_CORNER` | Placed in a corner | `corner`: NW/NE/SW/SE |
| `IN_ZONE` | Somewhere within the zone bounds | `min_distance_from_walls` |
| `FACING` | Positioned facing another object | `facing`: object_id, `distance` |
| `AROUND` | Arranged around another object | `around`: object_id, `count`, `distance` |
| `ABOVE` | Suspended above another object | `above`: object_id, `height` |
| `ON_WALL` | Mounted on a wall surface | `wall`, `height` |
| `NEXT_TO` | Adjacent to another object | `next_to`: object_id, `side`: left/right/front/back |
| `ON_TOP` | On the surface of another object | `on_top`: object_id |
| `BETWEEN` | Midpoint between two objects | `between`: [id_a, id_b] |
| `REPEAT_ALONG` | Repeated along a line | `along`: wall or axis, `count`, `spacing` |
| `CLUSTER` | Grouped loosely together | `near`: object_id or corner, `count`, `radius` |

### Few-shot examples in the skill

The skill includes 3 complete scene graph examples (tavern, gallery, arena) so the LLM has concrete patterns to follow. These are ~50 lines each, not full scenes — just the scene graph JSON.

### Density enforcement

The skill explicitly states minimum entity counts per zone type:

| Zone type | Min objects | Typical objects |
|-----------|-------------|-----------------|
| `passage` (entrance, hallway) | 3-5 | door, sign, mat, wall decor, light |
| `open_area` (hall, courtyard) | 10-20 | tables, chairs, floor items, overhead |
| `counter_area` (bar, shop) | 8-12 | counter, stools, shelves, items on counter |
| `corner` | 2-4 | barrels, crates, plants, small furniture |
| `wall_segment` (per 4m) | 1-3 | painting, torch, shelf, window |

Every wall segment >4m without an object gets flagged.
Every corner without an object gets flagged.
The LLM must resolve all flags before proceeding.

---

## Stage 2: Layout Resolver

### What it does

A **deterministic TypeScript function** (not LLM) that converts the scene graph into absolute (x, y, z) coordinates. This runs as a script, not as an LLM call.

### Algorithm

```
Input: Scene graph JSON + parcel dimensions
Output: Positioned scene graph (same JSON + x,y,z for each object)

1. COMPUTE zone bounds
   - Parse parcel count → total scene dimensions (e.g., 16x16 for 1x1)
   - Assign zones to regions based on wall/position hints
   - Zones must not overlap
   - Leave 1.5m circulation path between zones

2. RESOLVE placements (topological order)
   - Objects reference other objects (chair FACING table)
   - Build dependency graph
   - Resolve in topological order (independent objects first)

3. APPLY placement rules per type:
   
   AGAINST_WALL(wall="north"):
     x = zone.centerX
     z = zone.maxZ - 0.3  (0.3m offset from wall)
     rotation = face south (toward room)
   
   IN_CORNER(corner="NW"):
     x = zone.minX + 0.5
     z = zone.maxZ - 0.5
     rotation = face SE (45°)
   
   FACING(target, distance):
     position = target.position + (target.forward * distance)
     rotation = look_at(target.position)
   
   AROUND(target, count, distance):
     for i in 0..count:
       angle = (2π / count) * i
       x = target.x + cos(angle) * distance
       z = target.z + sin(angle) * distance
       rotation = look_at(target.position)
   
   ABOVE(target, height):
     x = target.x
     y = height
     z = target.z
   
   ON_WALL(wall, height):
     position on wall surface at specified height
     rotation = face inward
   
   CLUSTER(near, count, radius):
     distribute count objects randomly within radius
     jitter rotation ±15° for natural look

4. COLLISION CHECK
   - For each object pair, check bounding box overlap
   - If overlap: nudge the lower-priority object outward
   - Priority: FOCAL_POINT > furniture > seating > decoration
   
5. VALIDATE
   - All objects within parcel bounds?
   - No object at y < 0 (underground)?
   - All FACING rotations computed?
   - Circulation paths clear? (2m minimum between furniture groups)
```

### Implementation

This is a standalone script: `scripts/resolve-layout.ts` (~200-300 lines).
It reads the scene graph JSON from stdin, outputs the positioned scene graph to stdout.
No ML, no API calls. Pure geometry.

### Why this is critical

This is where the "magic" happens that the LLM can't do. The LLM says "4 chairs around the table." The resolver computes:
- chair_1: (3.6, 0, 6.0), rotation 0°
- chair_2: (4.4, 0, 6.0), rotation 180°
- chair_3: (4.0, 0, 5.6), rotation 90°
- chair_4: (4.0, 0, 6.4), rotation 270°

Each facing the table center. With 0.4m offset. No overlap. The LLM never could have generated these coordinates correctly on its own.

---

## Stage 3: Asset Matcher

### What it does

For each object in the positioned scene graph, search the asset catalogs and select the best matching .glb model.

### Process

1. **Read both catalogs** into context:
   - `asset-packs-catalog.md` — 2,746 models with names, tags, and download URLs
   - `open-source-3d-assets.md` — 991 models with names and download URLs

2. **For each object**, use `search_terms` to find candidates:
   - Match against asset names and tags
   - Filter by style consistency (prefer same pack for coherent visual style)
   - Select best match

3. **Style coherence rule**: Once the first 3 assets are matched to a pack (e.g., "Fantasy"), prefer that pack for subsequent matches. This prevents visual style mixing.

4. **Fallback hierarchy**:
   - First: exact match in preferred pack
   - Second: match in any pack
   - Third: match in CC0 catalog
   - Last resort: primitive (MeshRenderer.setBox/setCylinder) with PBR material — max 10% of entities

### Output

The scene graph is annotated with asset info:
```json
{
  "id": "bar_counter",
  "asset": {
    "name": "Bar_Wood",
    "filename": "Bar_Wood.glb",
    "pack": "Western",
    "download": "curl -o models/Bar_Wood.glb \"https://builder-items...\""
  },
  "position": [8, 0.6, 14.7],
  "rotation": [0, 180, 0],
  "scale": [1.5, 1, 1]
}
```

---

## Stage 4: Code Generator

### What it does

Takes the fully-resolved, asset-matched scene graph and produces a complete `src/index.ts`.

### Code structure

```typescript
import { engine, Transform, GltfContainer, MeshRenderer, Material,
         LightSource, TextShape } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color3, Color4 } from '@dcl/sdk/math'

// === HELPERS ===
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
  LightSource.create(e, {
    type: LightSourceType.LST_POINT,
    color, intensity, range: intensity / 20
  })
  return e
}

export function main() {

  // === ZONE: Entrance (south, z: 0-3) ===
  place('models/Door_Medieval.glb', [8, 0, 0.3], [0, 0, 0])
  place('models/Sign_Wooden.glb', [8, 2.5, -0.2], [0, 0, 0])
  // ... (all entrance objects)

  // === ZONE: Main Hall (center, z: 3-12) ===
  place('models/Table_Round.glb', [4, 0, 7])
  place('models/Chair_Medieval.glb', [3.6, 0, 7], [0, 90, 0])
  place('models/Chair_Medieval.glb', [4.4, 0, 7], [0, 270, 0])
  place('models/Chair_Medieval.glb', [4, 0, 6.6], [0, 0, 0])
  place('models/Chair_Medieval.glb', [4, 0, 7.4], [0, 180, 0])
  // ... (all main hall objects, 15-25 entities)

  // === ZONE: Bar (north, z: 12-16) ===
  place('models/Bar_Wood.glb', [8, 0.6, 14.7], [0, 180, 0], [1.5, 1, 1])
  place('models/Stool_Wooden.glb', [5, 0, 13.5], [0, 15, 0])
  place('models/Stool_Wooden.glb', [6.5, 0, 13.5], [0, -10, 0])
  place('models/Stool_Wooden.glb', [8, 0, 13.5], [0, 5, 0])
  place('models/Stool_Wooden.glb', [9.5, 0, 13.5], [0, -15, 0])
  // ... (all bar objects, 8-12 entities)

  // === CORNERS & SCATTER ===
  place('models/Barrel.glb', [0.5, 0, 15], [0, 30, 0])
  place('models/Barrel.glb', [0.8, 0, 14.2], [0, -15, 0])
  place('models/Crate_Wooden.glb', [0.4, 0.5, 14.6], [0, 45, 0])
  // ...

  // === LIGHTING ===
  addLight([8, 3, 14], Color3.create(1, 0.8, 0.5), 200)  // bar
  addLight([10, 2, 7], Color3.create(1, 0.6, 0.2), 400)   // fireplace
  addLight([4, 3.5, 7], Color3.create(1, 0.7, 0.4), 150)  // chandelier
  // ...
}
```

### Rules

1. **Generate ALL entities in one pass.** Never stop at 10 and ask "continue?"
2. **Group by zone** in comments for readability.
3. **Download all assets first** before generating code:
   ```bash
   mkdir -p models
   curl -o models/Door_Medieval.glb "https://..."
   curl -o models/Table_Round.glb "https://..."
   # ... all assets
   ```
4. **Slight rotation jitter** on repeated objects (±5-15°) for natural look.
5. **Total entity count** must match the scene graph. If the graph says 45 objects, the code has 45 `place()` calls.

---

## Stage 5: Verification & Iteration

### Process

1. Wait for hot-reload (~2-3s)
2. Screenshot from spawn point (south, facing north)
3. Evaluate against scene graph expectations:
   - Can you see the focal point (bar counter)?
   - Are tables populated with chairs?
   - Are walls decorated?
   - Does lighting create mood?
4. Move to each zone, screenshot, evaluate
5. Report: ✅ what works, ⚠️ what needs adjustment, ❌ what's broken
6. Fix issues zone by zone (re-run only that zone's section)
7. Max 3 iterations

### Verification checklist per zone

- [ ] Zone is not empty (meets minimum entity count)
- [ ] Objects are within zone bounds
- [ ] No visible clipping/overlap
- [ ] Furniture has correct orientation (chairs face tables, stools face bar)
- [ ] Wall decorations are at appropriate height (1.5-2.5m for paintings, 2-3m for lights)
- [ ] Floor is not bare for >4m stretches
- [ ] Lighting source present in or near zone

---

## Placement Rules Reference

These rules are embedded in the resolver and also provided to the LLM as constraints.

### Furniture placement

| Rule | Description |
|------|-------------|
| Wall offset | Objects AGAINST_WALL sit 0.2-0.3m from wall, never at x=0 or x=16 |
| Chair orientation | Chairs always FACE the table they belong to |
| Bar stools | Stools face the bar counter, spaced 1.0-1.5m apart |
| Table spacing | Minimum 2.5m between table centers for circulation |
| Table-to-wall | Tables need minimum 1.5m clearance from walls |

### Decoration placement

| Rule | Description |
|------|-------------|
| Wall art height | Paintings/frames: y = 1.6-2.0m (eye level) |
| Wall lights | Torches/sconces: y = 2.0-2.5m, every 3-4m along walls |
| Ceiling fixtures | Chandeliers: y = 3.0-4.0m, above tables or center of zones |
| Corner filling | Every corner gets 1-3 props (barrels, crates, plants) |
| Counter items | Small objects on surfaces: mugs at y = surface_height + 0.05m |

### Rotation rules

| Rule | Description |
|------|-------------|
| Natural jitter | Repeated same-model objects get ±5-15° Y rotation variation |
| Facing objects | FACING placement computes exact look-at rotation |
| Wall-mounted | Objects on walls rotate to face room interior |
| Corner props | Props in corners face 45° toward room center |

---

## File Structure (what gets created/modified)

```
skills/concept-to-scene/
├── SKILL.md                          # Main skill (pipeline orchestration)
├── references/
│   ├── scene-graph-schema.md         # JSON schema + placement vocabulary
│   ├── placement-rules.md            # All spatial rules for the resolver
│   ├── few-shot-tavern.json          # Example: complete tavern scene graph
│   ├── few-shot-gallery.json         # Example: complete gallery scene graph
│   └── few-shot-arena.json           # Example: complete arena scene graph

scripts/
├── resolve-layout.ts                 # Deterministic layout resolver (Stage 2)
└── validate-scene-graph.ts           # Validates scene graph before resolving
```

**No changes to `src/index.ts`, extensions, or any existing skill.**

---

## Implementation Order

| Phase | What | Effort | Dependency |
|-------|------|--------|------------|
| 1 | Scene graph schema + placement vocabulary | 2h | None |
| 2 | 3 few-shot examples (tavern, gallery, arena) | 3h | Phase 1 |
| 3 | Layout resolver script (`resolve-layout.ts`) | 4-6h | Phase 1 |
| 4 | Placement rules reference doc | 1h | Phase 3 |
| 5 | Updated SKILL.md (full pipeline) | 2h | All above |
| 6 | Validation script | 1h | Phase 1 |
| 7 | Test with 3 different scene types | 2h | All above |

**Total estimated effort: 15-17 hours**

---

## Success Criteria

A scene generated by this pipeline must:

1. Have **≥30 entities** for a 1-parcel interior scene
2. Have **no empty corners** (every corner has ≥1 prop)
3. Have **no bare walls** (decorations every ≤4m)
4. Have **correct orientations** (chairs face tables, stools face bar)
5. Have **no collisions** (no overlapping bounding boxes)
6. Have **coherent art style** (≥80% of assets from same pack)
7. Have **atmospheric lighting** (≥2 point lights with warm color)
8. **Compile and run** without errors in Decentraland preview
9. Be **recognizable** as the type of space requested (a tavern looks like a tavern)
