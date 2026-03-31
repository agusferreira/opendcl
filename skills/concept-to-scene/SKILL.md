---
name: concept-to-scene
description: Build a Decentraland SDK7 scene from concept art images. Analyzes reference images to extract spatial layout, identifies matching 3D assets from catalogs, generates a structured manifest, then produces dense scene code. Use when the user provides concept art, reference images, or asks to build a scene from a visual reference. Do NOT use for scenes described only in text (use create-scene instead).
---

# Concept Art to Scene

Build production-quality Decentraland scenes from visual references. This skill turns concept art into dense, spatially coherent SDK7 scenes by following a structured pipeline: **Analyze → Manifest → Match Assets → Generate Code → Verify**.

> **When to use:** The user provides one or more images (concept art, screenshots, photos, Pinterest boards) and wants a scene built from them. If they only have a text description, use **create-scene** instead.

## Pipeline Overview

```
Image(s) → Visual Analysis → Scene Manifest → Asset Matching → Code Generation → Screenshot Verification
```

Each step produces a concrete artifact. Never skip steps.

---

## Step 1: Analyze the Reference Image(s)

When the user provides image(s), analyze each one and extract:

### Spatial Layout
- **Zones**: Identify distinct areas (entrance, main area, back area, corners, elevated sections)
- **Dimensions**: Estimate approximate dimensions relative to parcel size (16m × 16m per parcel)
- **Flow**: How would a player move through this space? Where's the entrance? What's the path?

### Object Inventory
List **every visible object** — not just the big ones. Include:
- Large structures (walls, floors, counters, stages)
- Medium furniture (tables, chairs, shelves, barrels)
- Small props (mugs, candles, books, plates, bottles)
- Decorative elements (rugs, paintings, banners, plants)
- Lighting fixtures (chandeliers, lamps, torches, candles)
- Ceiling/overhead elements (beams, hanging signs, banners)
- Floor details (rugs, mats, puddles, cracks)
- Exterior elements if visible (signs, doorframes, planters)

**Be exhaustive.** A typical well-furnished room has 30-60 objects. If your inventory has fewer than 20 items, you're missing things — look again.

### Atmosphere
- **Lighting mood**: warm/cool, bright/dim, dramatic/flat, time of day
- **Color palette**: dominant colors, accent colors
- **Materials**: wood, stone, metal, fabric — what surfaces dominate?
- **Style**: medieval, modern, sci-fi, fantasy, cyberpunk, etc.

### Multiple Images
If the user provides multiple images:
- **Top-down/floor plan**: Use for spatial layout and zone positioning
- **Perspective views**: Use for object identification, lighting, and atmosphere
- **Detail shots**: Use for small prop identification and material/texture details
- **Cross-reference** all images to build a complete picture

Present your analysis to the user:
```
## Visual Analysis

### Layout
[Describe zones, dimensions, flow]

### Object Inventory (X items identified)
[List every object with approximate position]

### Atmosphere
[Lighting, colors, materials, style]

Proceed to manifest? Or adjust anything first?
```

Wait for user confirmation before proceeding.

---

## Step 2: Generate the Scene Manifest

Transform the visual analysis into a structured manifest. This is the **blueprint** — every entity that will exist in the scene.

Format:
```
## Scene Manifest: [Scene Name]
Parcels: [NxN] ([total] parcels)
Estimated entities: [count] (budget: [limit])
Style: [style keywords]

### Zone: [Zone Name] (x: [range], z: [range])
| # | Object | Asset Source | Position (x,y,z) | Scale | Rotation | Notes |
|---|--------|-------------|-------------------|-------|----------|-------|
| 1 | Bar counter | Catalog: search "wooden bar" | 8, 0.6, 14 | 2,1,1 | 0° | Centerpiece |
| 2 | Bar stool | Catalog: search "stool" | 6, 0, 13.5 | 1,1,1 | 15° | Slight angle |
| ... | ... | ... | ... | ... | ... | ... |

### Zone: [Next Zone]
| ... |

### Lighting
| # | Type | Position | Color | Intensity | Notes |
|---|------|----------|-------|-----------|-------|
| 1 | Point light | 8, 3.5, 13 | warm orange | 300 | Above fireplace |

### Ambient
- Skybox time: [value]
- Global light: [intensity]
- Fog: [yes/no, color, density]

TOTAL ENTITIES: [count]
TOTAL ESTIMATED TRIANGLES: [count]
```

### Manifest Rules
1. **Minimum 30 entities** for a 1-parcel interior scene. Fewer means the scene will feel empty.
2. **Every zone must have floor-level, eye-level, AND overhead objects.** If a zone only has floor items, add ceiling/wall elements.
3. **Corners are never empty.** Every corner gets at least one prop (barrel, plant, crate, lamp).
4. **Walls are never bare for >4m.** Add shelves, paintings, torches, windows, or other wall-mounted items.
5. **Include "scatter" props** — the small items that make a space feel lived-in (mugs on tables, books on shelves, candles, etc.). These are 30-40% of total entities.
6. **Position with intent.** Objects along walls should be at x≈0.3 or x≈15.7, not x=0 (inside the wall) or x=2 (floating away from wall).
7. **Vary Y positions.** Not everything sits on the floor. Tables at y=0.8, shelves at y=1.5, ceiling items at y=3+.

Present the manifest to the user for approval before proceeding.

---

## Step 3: Match Assets from Catalogs

For each item in the manifest, search both asset catalogs:

1. Read `{baseDir}/../../context/asset-packs-catalog.md` — 2,700+ Creator Hub models
2. Read `{baseDir}/../../context/open-source-3d-assets.md` — 991 CC0 models from Polygonal Mind
3. Read `{baseDir}/../../context/audio-catalog.md` — ambient sounds and SFX

### Matching Strategy
- **Search by keywords** from the object description (e.g., "wooden table" → search for "table", "wooden", "rustic")
- **Search by category/theme** (e.g., medieval → check Medieval Fantasy, Pirate, Nature packs)
- **Prefer themed packs** — using 3-4 models from the same pack creates visual consistency
- **Fallback to primitives** only when no asset matches. Primitives should be <10% of total entities.

### For each manifest item, record:
```
| Manifest Item | Matched Asset | Source | Download URL |
|---------------|--------------|--------|-------------|
| Bar counter | WoodenBar_01 | Asset Pack: Medieval | https://builder-items... |
| Bar stool | Stool_02 | CC0: Polygonal Mind | https://models.poly... |
| Fireplace | (primitive) | Box + emissive material | N/A |
```

If you can't find a good match for >30% of items, tell the user and suggest alternatives or theme adjustments.

---

## Step 4: Generate Scene Code

### Setup
1. **Run `/init`** to scaffold the project (if not already initialized)
2. **Download all matched assets:**
   ```bash
   mkdir -p models
   curl -o models/wooden_bar.glb "https://builder-items..."
   curl -o models/stool.glb "https://builder-items..."
   # ... all assets
   ```
3. **Download ambient audio if specified:**
   ```bash
   mkdir -p sounds
   curl -o sounds/tavern_ambience.mp3 "https://builder-items..."
   ```

### Code Generation Rules
1. **Generate ALL entities from the manifest in a single pass.** Do not stop at 5-10 entities and ask "want me to continue?" — generate the complete scene.
2. **Use helper functions** for repeated patterns:
   ```typescript
   function placeModel(src: string, pos: [number,number,number], scale?: [number,number,number], rot?: [number,number,number]) {
     const entity = engine.addEntity()
     Transform.create(entity, {
       position: Vector3.create(...pos),
       scale: scale ? Vector3.create(...scale) : Vector3.create(1,1,1),
       rotation: rot ? Quaternion.fromEulerDegrees(...rot) : Quaternion.Identity()
     })
     GltfContainer.create(entity, { src })
     return entity
   }
   ```
3. **Group entities by zone** in code comments for readability.
4. **Add lighting** as specified in the manifest. Use `LightSource` for key lights, emissive materials for ambient glow (candles, screens).
5. **Respect parcel limits.** Check entity count, triangle estimates against the budget.
6. **Add basic interactivity** where it makes sense (clickable doors, toggleable lights, hoverable objects with descriptions). Don't over-engineer — keep it simple.

### Code Structure
```typescript
import { engine, Transform, GltfContainer, MeshRenderer, Material, LightSource } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color3, Color4 } from '@dcl/sdk/math'

// Helper functions
function placeModel(src: string, pos: [number,number,number], scale?: [...], rot?: [...]) { ... }
function addPointLight(pos: [number,number,number], color: Color3, intensity: number) { ... }

export function main() {
  // === ZONE: Entrance (z: 0-3) ===
  placeModel('models/door.glb', [8, 0, 0.3])
  placeModel('models/sign.glb', [8, 2.5, -0.2])
  // ...

  // === ZONE: Main Area (z: 3-12) ===
  placeModel('models/table.glb', [4, 0, 6])
  placeModel('models/chair.glb', [3, 0, 6], [1,1,1], [0, 45, 0])
  // ...

  // === ZONE: Back Area (z: 12-16) ===
  // ...

  // === LIGHTING ===
  addPointLight([8, 3.5, 13], Color3.create(1, 0.7, 0.3), 300)
  // ...

  // === AUDIO ===
  // ...
}
```

---

## Step 5: Visual Verification

After generating the complete scene code:

1. **Wait for hot-reload** (~2-3 seconds)
2. **Take a screenshot** from the spawn point
3. **Compare against the original concept art:**
   - Does the overall layout match?
   - Are the key focal points in the right places?
   - Is the density comparable? (Look for empty zones)
   - Does the lighting mood match?
4. **Take 1-2 more screenshots** from different angles (move forward into the scene, look around)
5. **Report findings honestly:**
   ```
   ## Verification
   ✅ Layout matches concept — bar in back, tables in center
   ✅ Density: 42 entities placed, scene feels furnished
   ⚠️ Right corner (NE) looks sparse — could add more barrels/crates
   ⚠️ Lighting is flatter than concept — need stronger point light at fireplace
   ❌ Ceiling is empty — concept shows wooden beams, need to add
   
   Fixing the 3 issues now...
   ```
6. **Fix issues and re-verify** (up to 3 iterations)

### Verification Checklist
- [ ] No large empty floor areas (>4m²) visible
- [ ] Focal point visible from spawn
- [ ] Walls/edges have objects along them
- [ ] Vertical variety exists (floor, eye-level, ceiling)
- [ ] Lighting creates mood (not uniformly flat)
- [ ] Scene matches concept art intent (not exact, but recognizable)
- [ ] All entities are within parcel boundaries
- [ ] No objects floating or clipping through each other

---

## Tips

- **Density is king.** The #1 difference between "tech demo" and "production" is object count. A 1-parcel tavern with 40+ entities feels real; one with 8 feels like a test scene.
- **Scatter props sell realism.** Mugs, plates, candles, books, rugs — these small items are what make a space feel inhabited.
- **Consistent theme > perfect match.** Using 80% of assets from one themed pack looks better than mixing 5 different art styles to get "perfect" individual matches.
- **Lighting is half the atmosphere.** Even a sparse scene looks good with dramatic lighting. Even a dense scene looks bad with flat lighting.
- **The concept art is a target, not a contract.** The goal is a scene that captures the same feeling and spatial composition — not a pixel-perfect recreation (which is impossible with pre-made assets).
