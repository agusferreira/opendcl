#!/usr/bin/env npx tsx
/**
 * resolve-layout.ts — Deterministic layout resolver for scene graphs.
 *
 * Reads a scene graph JSON from stdin (or file arg), resolves all relative
 * placements into absolute (x, y, z) coordinates, checks collisions,
 * and outputs the positioned scene graph to stdout.
 *
 * Usage:
 *   cat scene-graph.json | npx tsx scripts/resolve-layout.ts
 *   npx tsx scripts/resolve-layout.ts scene-graph.json
 */

import { readFileSync } from "node:fs";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Vec3 { x: number; y: number; z: number; }
interface Zone {
  id: string; type: string; wall?: string; position?: string;
  width?: number; depth?: number; height?: number; description?: string;
  // resolved bounds
  bounds?: { minX: number; minZ: number; maxX: number; maxZ: number; };
}
interface SceneObject {
  id: string; type: string; search_terms: string[]; zone: string;
  placement: string; role?: string; count?: number; spacing?: number;
  height_override?: number;
  // placement params
  wall?: string; corner?: string; facing?: string; around?: string;
  above?: string; next_to?: string; on_top?: string; near?: string;
  side?: string; gap?: number; distance?: number;
  min_distance_from_walls?: number; radius?: number;
  arrangement?: string; height?: number;
  // resolved
  resolved?: ResolvedInstance[];
}
interface ResolvedInstance {
  position: Vec3; rotation: Vec3; scale: Vec3;
}
interface SceneGraph {
  scene: {
    name: string; type: string; parcels: [number, number];
    style: string; zones: Zone[]; objects: SceneObject[];
    lighting: any;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PARCEL_SIZE = 16; // meters
const WALL_OFFSET = 0.3;
const CORNER_OFFSET = 0.5;
const DEFAULT_HEIGHT = 4.0;
const CIRCULATION_GAP = 1.5;

// ─── Utility ────────────────────────────────────────────────────────────────

function vec(x: number, y: number, z: number): Vec3 { return { x, y, z }; }
function lookAtY(from: Vec3, to: Vec3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.atan2(dx, dz) * (180 / Math.PI);
}
function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * 2 * range;
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Zone Resolver ──────────────────────────────────────────────────────────

function resolveZones(zones: Zone[], sceneW: number, sceneD: number): void {
  // First pass: wall-anchored zones
  const used: { minX: number; minZ: number; maxX: number; maxZ: number; }[] = [];

  for (const z of zones) {
    const w = z.width || 4;
    const d = z.depth || 4;

    if (z.wall) {
      switch (z.wall) {
        case "south":
          z.bounds = { minX: (sceneW - w) / 2, minZ: 0, maxX: (sceneW + w) / 2, maxZ: d };
          break;
        case "north":
          z.bounds = { minX: (sceneW - w) / 2, minZ: sceneD - d, maxX: (sceneW + w) / 2, maxZ: sceneD };
          break;
        case "west":
          z.bounds = { minX: 0, minZ: (sceneD - d) / 2, maxX: w, maxZ: (sceneD + d) / 2 };
          break;
        case "east":
          z.bounds = { minX: sceneW - w, minZ: (sceneD - d) / 2, maxX: sceneW, maxZ: (sceneD + d) / 2 };
          break;
      }
    } else if (z.position) {
      switch (z.position) {
        case "corner_NW": z.bounds = { minX: 0, minZ: sceneD - 2, maxX: 2, maxZ: sceneD }; break;
        case "corner_NE": z.bounds = { minX: sceneW - 2, minZ: sceneD - 2, maxX: sceneW, maxZ: sceneD }; break;
        case "corner_SW": z.bounds = { minX: 0, minZ: 0, maxX: 2, maxZ: 2 }; break;
        case "corner_SE": z.bounds = { minX: sceneW - 2, minZ: 0, maxX: sceneW, maxZ: 2 }; break;
        case "center":
          // fill remaining center space
          z.bounds = {
            minX: CIRCULATION_GAP,
            minZ: CIRCULATION_GAP + 2, // leave south passage
            maxX: sceneW - CIRCULATION_GAP,
            maxZ: sceneD - CIRCULATION_GAP - 3, // leave north counter area
          };
          break;
      }
    }

    if (!z.bounds) {
      // fallback: center
      z.bounds = {
        minX: (sceneW - w) / 2, minZ: (sceneD - d) / 2,
        maxX: (sceneW + w) / 2, maxZ: (sceneD + d) / 2,
      };
    }
    used.push(z.bounds);
  }
}

// ─── Object Resolver ────────────────────────────────────────────────────────

function getZoneBounds(zones: Zone[], zoneId: string) {
  const z = zones.find(z => z.id === zoneId);
  if (!z?.bounds) throw new Error(`Zone not found or unresolved: ${zoneId}`);
  return z.bounds;
}

function getObjectCenter(objects: SceneObject[], objId: string): Vec3 {
  const obj = objects.find(o => o.id === objId);
  if (!obj?.resolved?.[0]) throw new Error(`Object not resolved yet: ${objId}`);
  return obj.resolved[0].position;
}

function getCornerPos(corner: string, sceneW: number, sceneD: number): Vec3 {
  switch (corner) {
    case "NW": return vec(CORNER_OFFSET, 0, sceneD - CORNER_OFFSET);
    case "NE": return vec(sceneW - CORNER_OFFSET, 0, sceneD - CORNER_OFFSET);
    case "SW": return vec(CORNER_OFFSET, 0, CORNER_OFFSET);
    case "SE": return vec(sceneW - CORNER_OFFSET, 0, CORNER_OFFSET);
    default: return vec(sceneW / 2, 0, sceneD / 2);
  }
}

function wallPosition(wall: string, bounds: ReturnType<typeof getZoneBounds>, y: number, idx: number, count: number, spacing: number): Vec3 {
  switch (wall) {
    case "north": {
      const startX = bounds.minX + (bounds.maxX - bounds.minX - (count - 1) * spacing) / 2 + idx * spacing;
      return vec(clamp(startX, bounds.minX + 0.5, bounds.maxX - 0.5), y, bounds.maxZ - WALL_OFFSET);
    }
    case "south": {
      const startX = bounds.minX + (bounds.maxX - bounds.minX - (count - 1) * spacing) / 2 + idx * spacing;
      return vec(clamp(startX, bounds.minX + 0.5, bounds.maxX - 0.5), y, bounds.minZ + WALL_OFFSET);
    }
    case "west": {
      const startZ = bounds.minZ + (bounds.maxZ - bounds.minZ - (count - 1) * spacing) / 2 + idx * spacing;
      return vec(bounds.minX + WALL_OFFSET, y, clamp(startZ, bounds.minZ + 0.5, bounds.maxZ - 0.5));
    }
    case "east": {
      const startZ = bounds.minZ + (bounds.maxZ - bounds.minZ - (count - 1) * spacing) / 2 + idx * spacing;
      return vec(bounds.maxX - WALL_OFFSET, y, clamp(startZ, bounds.minZ + 0.5, bounds.maxZ - 0.5));
    }
    default: return vec(bounds.minX, y, bounds.minZ);
  }
}

function wallRotation(wall: string): Vec3 {
  switch (wall) {
    case "north": return vec(0, 180, 0);
    case "south": return vec(0, 0, 0);
    case "west": return vec(0, 90, 0);
    case "east": return vec(0, -90, 0);
    default: return vec(0, 0, 0);
  }
}

// Track placed positions for IN_ZONE placement to avoid overlap
const placedPositions: Vec3[] = [];
const MIN_OBJECT_DISTANCE = 1.8;

function findOpenPosition(bounds: ReturnType<typeof getZoneBounds>, minWallDist: number): Vec3 {
  const mwd = minWallDist || 1.5;
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = bounds.minX + mwd + Math.random() * (bounds.maxX - bounds.minX - 2 * mwd);
    const z = bounds.minZ + mwd + Math.random() * (bounds.maxZ - bounds.minZ - 2 * mwd);
    const candidate = vec(x, 0, z);
    const tooClose = placedPositions.some(p => {
      const dx = p.x - candidate.x;
      const dz = p.z - candidate.z;
      return Math.sqrt(dx * dx + dz * dz) < MIN_OBJECT_DISTANCE;
    });
    if (!tooClose) {
      placedPositions.push(candidate);
      return candidate;
    }
  }
  // fallback: center of zone
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  return vec(cx, 0, cz);
}

function resolveObject(obj: SceneObject, zones: Zone[], objects: SceneObject[], sceneW: number, sceneD: number): void {
  const count = obj.count || 1;
  const instances: ResolvedInstance[] = [];
  const bounds = obj.zone ? getZoneBounds(zones, obj.zone) : { minX: 0, minZ: 0, maxX: sceneW, maxZ: sceneD };
  const y = obj.height_override || 0;

  switch (obj.placement) {
    case "AGAINST_WALL": {
      const wall = obj.wall || "north";
      for (let i = 0; i < count; i++) {
        const spacing = obj.spacing || 2;
        const pos = wallPosition(wall, bounds, y, i, count, spacing);
        instances.push({ position: pos, rotation: wallRotation(wall), scale: vec(1, 1, 1) });
      }
      break;
    }

    case "IN_CORNER": {
      const corner = obj.corner || "NW";
      const base = getCornerPos(corner, sceneW, sceneD);
      for (let i = 0; i < count; i++) {
        const pos = vec(base.x + jitter(0, 0.3) * i, y, base.z + jitter(0, 0.3) * i);
        const rotY = corner === "NW" ? -45 : corner === "NE" ? -135 : corner === "SW" ? 45 : 135;
        instances.push({ position: pos, rotation: vec(0, jitter(rotY, 15), 0), scale: vec(1, 1, 1) });
      }
      break;
    }

    case "IN_ZONE": {
      for (let i = 0; i < count; i++) {
        const pos = findOpenPosition(bounds, obj.min_distance_from_walls || 1.5);
        instances.push({ position: vec(pos.x, y, pos.z), rotation: vec(0, jitter(0, 180), 0), scale: vec(1, 1, 1) });
      }
      break;
    }

    case "FACING": {
      const target = getObjectCenter(objects, obj.facing!);
      const dist = obj.distance || 1.0;
      for (let i = 0; i < count; i++) {
        const offset = count > 1 ? (i - (count - 1) / 2) * (obj.spacing || 1.2) : 0;
        // spread along X axis relative to target
        const pos = vec(target.x + offset, y, target.z - dist);
        const rotY = lookAtY(pos, target);
        instances.push({ position: pos, rotation: vec(0, rotY, 0), scale: vec(1, 1, 1) });
      }
      break;
    }

    case "AROUND": {
      const target = getObjectCenter(objects, obj.around!);
      const dist = obj.distance || 0.5;
      for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI / count) * i;
        const px = target.x + Math.cos(angle) * dist;
        const pz = target.z + Math.sin(angle) * dist;
        const pos = vec(px, y, pz);
        const rotY = lookAtY(pos, target);
        instances.push({ position: pos, rotation: vec(0, rotY + jitter(0, 5), 0), scale: vec(1, 1, 1) });
      }
      break;
    }

    case "ABOVE": {
      const target = getObjectCenter(objects, obj.above!);
      const h = obj.height || 3.5;
      instances.push({ position: vec(target.x, h, target.z), rotation: vec(0, 0, 0), scale: vec(1, 1, 1) });
      break;
    }

    case "ON_WALL": {
      const wall = obj.wall || "west";
      const h = obj.height || 1.8;
      const repeatCount = (obj as any).repeat?.count || count;
      const repeatSpacing = (obj as any).repeat?.spacing || obj.spacing || 3;
      for (let i = 0; i < repeatCount; i++) {
        const pos = wallPosition(wall, bounds, h, i, repeatCount, repeatSpacing);
        instances.push({ position: pos, rotation: wallRotation(wall), scale: vec(1, 1, 1) });
      }
      break;
    }

    case "NEXT_TO": {
      const target = getObjectCenter(objects, obj.next_to!);
      const gap = obj.gap || 0.5;
      const side = obj.side || "right";
      let pos: Vec3;
      switch (side) {
        case "left": pos = vec(target.x - gap - 0.5, y, target.z); break;
        case "right": pos = vec(target.x + gap + 0.5, y, target.z); break;
        case "front": pos = vec(target.x, y, target.z - gap - 0.5); break;
        case "back": pos = vec(target.x, y, target.z + gap + 0.5); break;
        default: pos = vec(target.x + gap, y, target.z);
      }
      instances.push({ position: pos, rotation: vec(0, jitter(0, 10), 0), scale: vec(1, 1, 1) });
      break;
    }

    case "ON_TOP": {
      const target = getObjectCenter(objects, obj.on_top!);
      // surface height estimate: 0.8m for tables, 1.0m for counters, 1.5m for shelves
      const surfaceH = obj.height_override || 0.85;
      for (let i = 0; i < count; i++) {
        const ox = jitter(0, 0.2);
        const oz = jitter(0, 0.2);
        instances.push({
          position: vec(target.x + ox, surfaceH, target.z + oz),
          rotation: vec(0, jitter(0, 30), 0),
          scale: vec(1, 1, 1),
        });
      }
      break;
    }

    case "REPEAT_ALONG": {
      const wall = obj.wall || "west";
      const h = obj.height || 0;
      const spacing = obj.spacing || 3;
      for (let i = 0; i < count; i++) {
        const pos = wallPosition(wall, bounds, h, i, count, spacing);
        instances.push({ position: pos, rotation: wallRotation(wall), scale: vec(1, 1, 1) });
      }
      break;
    }

    case "CLUSTER": {
      const center = obj.near?.startsWith("corner_")
        ? getCornerPos(obj.near.replace("corner_", ""), sceneW, sceneD)
        : obj.near ? getObjectCenter(objects, obj.near) : findOpenPosition(bounds, 1);
      const r = obj.radius || 1.0;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const dist = Math.random() * r;
        const pos = vec(
          clamp(center.x + Math.cos(angle) * dist, 0.3, sceneW - 0.3),
          y,
          clamp(center.z + Math.sin(angle) * dist, 0.3, sceneD - 0.3)
        );
        instances.push({ position: pos, rotation: vec(0, jitter(0, 30), 0), scale: vec(1, 1, 1) });
      }
      break;
    }

    default:
      console.error(`Unknown placement type: ${obj.placement} for ${obj.id}`);
      instances.push({ position: vec(8, 0, 8), rotation: vec(0, 0, 0), scale: vec(1, 1, 1) });
  }

  obj.resolved = instances;
}

// ─── Dependency ordering ────────────────────────────────────────────────────

function getDependency(obj: SceneObject): string | null {
  return obj.facing || obj.around || obj.above || obj.next_to || obj.on_top || obj.near || null;
}

function topologicalSort(objects: SceneObject[]): SceneObject[] {
  const sorted: SceneObject[] = [];
  const visited = new Set<string>();
  const objMap = new Map(objects.map(o => [o.id, o]));

  function visit(id: string) {
    if (visited.has(id)) return;
    const obj = objMap.get(id);
    if (!obj) return;
    const dep = getDependency(obj);
    if (dep && !dep.startsWith("corner_") && objMap.has(dep)) {
      visit(dep);
    }
    visited.add(id);
    sorted.push(obj);
  }

  for (const obj of objects) visit(obj.id);
  return sorted;
}

// ─── Collision detection ────────────────────────────────────────────────────

function checkCollisions(objects: SceneObject[]): string[] {
  const warnings: string[] = [];
  // Skip collision checks for items placed ON_TOP or ABOVE (they share X/Z intentionally)
  const skipTypes = new Set(["ON_TOP", "ABOVE", "CLUSTER"]);
  const allInstances: { id: string; pos: Vec3; placement: string; }[] = [];

  for (const obj of objects) {
    if (!obj.resolved) continue;
    for (const inst of obj.resolved) {
      allInstances.push({ id: obj.id, pos: inst.position, placement: obj.placement });
    }
  }

  for (let i = 0; i < allInstances.length; i++) {
    for (let j = i + 1; j < allInstances.length; j++) {
      const a = allInstances[i];
      const b = allInstances[j];
      if (a.id === b.id) continue;
      if (skipTypes.has(a.placement) || skipTypes.has(b.placement)) continue;
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const dz = a.pos.z - b.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.3 && Math.abs(dy) < 0.5) {
        warnings.push(`⚠️ Collision: ${a.id} and ${b.id} are ${dist.toFixed(2)}m apart`);
      }
    }
  }
  return warnings;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  // Read input
  let input: string;
  const fileArg = process.argv[2];
  if (fileArg) {
    input = readFileSync(fileArg, "utf-8");
  } else {
    input = readFileSync(0, "utf-8"); // stdin
  }

  const graph: SceneGraph = JSON.parse(input);
  const sceneW = graph.scene.parcels[0] * PARCEL_SIZE;
  const sceneD = graph.scene.parcels[1] * PARCEL_SIZE;

  // 1. Resolve zones
  resolveZones(graph.scene.zones, sceneW, sceneD);

  // 2. Topological sort objects
  const sorted = topologicalSort(graph.scene.objects);

  // 3. Resolve each object
  for (const obj of sorted) {
    try {
      resolveObject(obj, graph.scene.zones, graph.scene.objects, sceneW, sceneD);
    } catch (e: any) {
      console.error(`Error resolving ${obj.id}: ${e.message}`);
      obj.resolved = [{ position: vec(8, 0, 8), rotation: vec(0, 0, 0), scale: vec(1, 1, 1) }];
    }
  }

  // 4. Check collisions
  const warnings = checkCollisions(graph.scene.objects);
  if (warnings.length > 0) {
    console.error("\n=== Layout Warnings ===");
    for (const w of warnings) console.error(w);
  }

  // 5. Summary
  let totalEntities = 0;
  for (const obj of graph.scene.objects) {
    totalEntities += obj.resolved?.length || 0;
  }
  console.error(`\n✅ Resolved ${graph.scene.objects.length} objects → ${totalEntities} entities`);
  console.error(`   Scene: ${sceneW}m × ${sceneD}m (${graph.scene.parcels.join("x")} parcels)`);
  console.error(`   Zones: ${graph.scene.zones.length}`);

  // 6. Output positioned graph
  // Round all positions to 2 decimal places for cleaner output
  for (const obj of graph.scene.objects) {
    if (obj.resolved) {
      for (const inst of obj.resolved) {
        inst.position.x = Math.round(inst.position.x * 100) / 100;
        inst.position.y = Math.round(inst.position.y * 100) / 100;
        inst.position.z = Math.round(inst.position.z * 100) / 100;
        inst.rotation.x = Math.round(inst.rotation.x * 100) / 100;
        inst.rotation.y = Math.round(inst.rotation.y * 100) / 100;
        inst.rotation.z = Math.round(inst.rotation.z * 100) / 100;
      }
    }
  }

  console.log(JSON.stringify(graph, null, 2));
}

main();
