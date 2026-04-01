# Scene Graph Schema

## Overview

A scene graph describes WHAT objects exist and HOW they relate spatially — without absolute coordinates. A deterministic resolver converts this to positioned entities.

## JSON Schema

```json
{
  "scene": {
    "name": "string — scene title",
    "type": "interior | exterior | mixed",
    "parcels": [1, 1],
    "style": "string — art style keywords for asset matching",
    "zones": [ /* Zone objects */ ],
    "objects": [ /* Object objects */ ],
    "lighting": { /* Lighting config */ }
  }
}
```

## Zone Schema

Zones divide the scene into rectangular regions. Every object belongs to a zone.

```json
{
  "id": "string — unique zone identifier",
  "type": "passage | open_area | counter_area | corner | stage | storage",
  "wall": "north | south | east | west (which wall this zone hugs, if any)",
  "position": "center | corner_NW | corner_NE | corner_SW | corner_SE",
  "width": "number — meters along X axis",
  "depth": "number — meters along Z axis",
  "height": "number — ceiling height (default 4.0)",
  "description": "string — what this zone is for"
}
```

Zone placement priority:
1. Zones with `wall` specified are placed against that wall first
2. Zones with `position: center` fill remaining space
3. `corner` zones are 2x2m by default
4. Minimum 1.5m gap between zones for circulation

## Object Schema

```json
{
  "id": "string — unique object identifier",
  "type": "furniture | seating | fixture | decoration | lighting | structure | interactive",
  "search_terms": ["array", "of", "asset", "search", "keywords"],
  "zone": "string — zone id this object belongs to",
  "placement": "PLACEMENT_TYPE (see vocabulary below)",
  "role": "FOCAL_POINT | SECONDARY_FOCAL | null",
  "count": "number — how many instances (default 1)",
  "spacing": "number — meters between instances if count > 1",
  "height_override": "number — force Y position (for wall-mounted, ceiling items)"
}
```

## Placement Vocabulary

The LLM MUST use one of these placement types. Never invent coordinates.

### AGAINST_WALL
Object placed flush against a wall, facing inward.
```json
{ "placement": "AGAINST_WALL", "wall": "north" }
```
- Offset: 0.3m from wall surface
- Rotation: faces opposite direction (north wall → faces south)

### IN_CORNER
Object placed in a scene corner.
```json
{ "placement": "IN_CORNER", "corner": "NW" }
```
- Offset: 0.5m from both walls
- Rotation: faces room center (45°)

### IN_ZONE
Object placed somewhere within its zone bounds.
```json
{ "placement": "IN_ZONE", "min_distance_from_walls": 2.0 }
```
- Resolver finds open position within zone
- Respects minimum wall distance

### FACING
Object positioned facing another object.
```json
{ "placement": "FACING", "facing": "bar_counter", "distance": 1.0 }
```
- Placed `distance` meters from target
- Rotated to look at target center

### AROUND
Multiple objects arranged in a circle around a target.
```json
{ "placement": "AROUND", "around": "table_1", "count": 4, "distance": 0.4 }
```
- Evenly distributed around target
- Each instance faces target center

### ABOVE
Object suspended above another.
```json
{ "placement": "ABOVE", "above": "table_1", "height": 3.5 }
```
- Same X/Z as target, Y = height

### ON_WALL
Object mounted on a wall surface.
```json
{ "placement": "ON_WALL", "wall": "west", "height": 2.0 }
```
- X/Z on wall surface, Y = height
- Faces inward

### NEXT_TO
Adjacent to another object.
```json
{ "placement": "NEXT_TO", "next_to": "bar_counter", "side": "left", "gap": 0.3 }
```
- Placed to the specified side with gap

### ON_TOP
On the surface of another object.
```json
{ "placement": "ON_TOP", "on_top": "bar_counter" }
```
- X/Z = target X/Z (with small random offset ±0.2m)
- Y = target surface height

### REPEAT_ALONG
Repeated along a wall or axis.
```json
{ "placement": "REPEAT_ALONG", "wall": "east", "count": 3, "spacing": 4.0, "height": 2.2 }
```
- Evenly distributed along the wall
- Centered on the wall

### CLUSTER
Loosely grouped objects.
```json
{ "placement": "CLUSTER", "near": "corner_NW", "count": 3, "radius": 1.0 }
```
- Random positions within radius
- Random rotation jitter ±30°

## Lighting Schema

```json
{
  "lighting": {
    "mood": "warm | cool | dramatic | neutral",
    "time": "morning | afternoon | evening | night",
    "ambient_intensity": 0.3,
    "key_lights": [
      {
        "near": "object_id — light placed near this object",
        "color": [1.0, 0.6, 0.2],
        "intensity": 400
      }
    ]
  }
}
```

## Density Requirements

| Zone type | Min objects | Includes |
|-----------|------------|----------|
| passage | 3-5 | door, sign, mat, wall decor, light |
| open_area | 10-20 | tables, chairs, floor items, overhead, scatter |
| counter_area | 8-12 | counter, stools, shelves, surface items |
| corner | 2-4 | barrels, crates, plants |
| stage | 5-8 | platform, lights, equipment |
| storage | 3-6 | shelves, boxes, barrels |

**Minimum total: 30 entities for 1 parcel. Target: 40-60.**

## Validation Rules

Before proceeding to Stage 2, verify:
1. Every zone has at least min_objects objects
2. Every corner of the scene (NW, NE, SW, SE) has at least 1 object
3. At least 1 object has role FOCAL_POINT
4. At least 2 key_lights defined
5. Total objects ≥ 30 for 1-parcel scene
6. Every object has search_terms with ≥2 keywords
7. No duplicate object IDs
