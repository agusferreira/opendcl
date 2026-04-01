# Placement Rules

Physical and aesthetic rules enforced by the layout resolver and expected in scene graphs.

## Furniture

| Rule | Value | Why |
|------|-------|-----|
| Wall offset | 0.2-0.3m from wall surface | Prevents clipping into walls |
| Chair → table | FACING table center, 0.3-0.5m from edge | Chairs must face what they belong to |
| Bar stool → counter | FACING counter, 0.8-1.0m from counter face | Players need room to "sit" |
| Stool spacing | 1.0-1.5m center-to-center | Shoulder room |
| Table → table | ≥2.5m center-to-center | Circulation between groups |
| Table → wall | ≥1.5m from nearest wall | Room to walk around |
| Sofa depth | Allow 0.8-1.0m in front for coffee table | Functional arrangement |

## Decoration

| Rule | Value | Why |
|------|-------|-----|
| Wall art height | y = 1.5-2.0m | Eye level for standing avatar |
| Wall sconce/torch | y = 2.0-2.5m | Above head height |
| Ceiling fixture | y = 3.0-4.0m | Overhead, clear of avatar |
| Counter surface items | y = surface + 0.05m | Sits on top, not floating |
| Table surface items | y = 0.80-0.85m | Standard table height |
| Floor decorations | y = 0.01m | Slightly above ground to prevent z-fight |
| Corner props | 0.4-0.6m from both walls | Not jammed into corner, not floating |

## Density

| Rule | Value |
|------|-------|
| Maximum bare wall | 4m without any wall-mounted object |
| Minimum corner fill | Every corner has ≥1 prop |
| Scatter ratio | 30-40% of entities should be small props (mugs, candles, books, etc.) |
| Vertical layers | Every zone must have items at floor (y<0.5), eye (y 0.5-2.5), AND overhead (y>2.5) |

## Rotation

| Rule | Description |
|------|-------------|
| Natural jitter | Same-model repeated objects: ±5-15° Y rotation variation |
| Face target | FACING/AROUND placements compute exact look-at Y rotation |
| Wall-mounted | Face 180° from wall (into the room) |
| Corner objects | Face ~45° toward room center |
| Random scatter | IN_ZONE floor props: fully random Y rotation |

## Collision Avoidance

| Rule | Value |
|------|-------|
| Floor objects | ≥0.3m apart (center-to-center) |
| Furniture groups | ≥1.8m from other furniture groups |
| ON_TOP items | Exempt from collision (share X/Z with parent) |
| CLUSTER items | Exempt from collision (intentionally close) |
| Wall items | No collision check (different Y plane) |

## Parcel Limits (SDK7)

| Parcels | Max Entities | Max Triangles | Max Textures |
|---------|-------------|---------------|-------------|
| 1 (16x16) | ~512 | ~10,000 | 10 MB |
| 2 | ~640 | ~12,800 | 12 MB |
| 4 (2x2) | ~896 | ~17,920 | 17 MB |
| 9 (3x3) | ~1,408 | ~28,160 | 28 MB |

Target: stay under 60% of limits to leave room for interactivity and systems.
