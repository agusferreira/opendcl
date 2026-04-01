import { engine, Transform, GltfContainer, MeshRenderer, MeshCollider, Material } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'

function place(src: string, pos: [number, number, number], rot?: [number, number, number], scale?: [number, number, number]) {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(...pos),
    rotation: rot ? Quaternion.fromEulerDegrees(...rot) : undefined,
    scale: scale ? Vector3.create(...scale) : undefined
  })
  GltfContainer.create(e, { src })
  return e
}

function box(pos: [number, number, number], scale: [number, number, number], color: [number, number, number, number]) {
  const e = engine.addEntity()
  Transform.create(e, {
    position: Vector3.create(...pos),
    scale: Vector3.create(...scale)
  })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Material.setPbrMaterial(e, {
    albedoColor: Color4.create(...color)
  })
  return e
}

export function main() {
  // =============================================
  // FOURTH & GOAL SPORTS BAR
  // Cyberpunk Modern Western — 1 parcel (16x16)
  // =============================================

  // === STRUCTURE: Walls & Floor (PBR boxes) ===
  box([8, 0, 8], [16, 0.1, 16], [0.15, 0.1, 0.08, 1])         // dark wood floor
  box([8, 2, 15.95], [16, 4, 0.1], [0.12, 0.08, 0.06, 1])      // north wall
  box([2.75, 2, 0.05], [5.5, 4, 0.1], [0.12, 0.08, 0.06, 1])   // south wall left
  box([13.25, 2, 0.05], [5.5, 4, 0.1], [0.12, 0.08, 0.06, 1])  // south wall right
  box([15.95, 2, 8], [0.1, 4, 16], [0.12, 0.08, 0.06, 1])      // east wall
  box([0.05, 2, 8], [0.1, 4, 16], [0.12, 0.08, 0.06, 1])       // west wall
  box([8, 3.95, 8], [16, 0.1, 16], [0.08, 0.06, 0.05, 1])      // ceiling

  // === ZONE: Entrance (south center) ===
  place('models/Door 5.glb', [8, 0, 0.3])
  place('models/Neon_Hanging_Sign.glb', [8, 2.8, 0.3], [0, 0, 0], [1.5, 1.5, 1.5])
  place('models/Carpet_02.glb', [8, 0.01, 1.49], [0, 63, 0], [0.6, 1, 0.4])
  place('models/Chandelier_02.glb', [9, 0, 0.4], [0, 0, 0], [0.5, 0.5, 0.5])  // coat rack
  place('models/Lamp 1.glb', [8, 3, 0.5])

  // === ZONE: Main Floor ===
  // High-top table 1 (center-left)
  place('models/Table 3.glb', [6.24, 0, 8.67], [0, -100, 0], [0.7, 1.1, 0.7])
  place('models/Bar Stool.glb', [6.74, 0, 8.67], [0, -87, 0])
  place('models/Bar Stool.glb', [6.24, 0, 9.17], [0, 180, 0])
  place('models/Bar Stool.glb', [5.74, 0, 8.67], [0, 87, 0])
  place('models/Bar Stool.glb', [6.24, 0, 8.17], [0, -2, 0])
  // Drinks on table 1
  place('models/Bottle_Sake.glb', [6.25, 0.85, 8.81], [0, -4, 0])
  place('models/Bottle_Sake.glb', [6.2, 0.85, 8.62], [0, 21, 0])
  place('models/Bottle_06.glb', [6.39, 0.85, 8.48], [0, -19, 0])

  // High-top table 2 (center-right)
  place('models/Table 3.glb', [9.68, 0, 8.74], [0, 66, 0], [0.7, 1.1, 0.7])
  place('models/Bar Stool.glb', [10.18, 0, 8.74], [0, -85, 0])
  place('models/Bar Stool.glb', [9.43, 0, 9.17], [0, 145, 0])
  place('models/Bar Stool.glb', [9.43, 0, 8.31], [0, 26, 0])
  place('models/Bottle_Sake.glb', [9.59, 0.85, 8.69], [0, -11, 0])
  place('models/Milk 1.glb', [9.86, 0.85, 8.72], [0, -30, 0])

  // Booth (south-east area)
  place('models/Furnit 4 Desk.glb', [10.29, 0, 5.71], [0, -95, 0])
  place('models/Bench 3.glb', [9.69, 0, 5.71], [0, -7, 0])
  place('models/Bench 3.glb', [10.89, 0, 5.71], [0, 2, 0])
  place('models/Hot_Dog.glb', [10.27, 0.85, 5.75], [0, -8, 0])
  place('models/Soup_Bowl.glb', [10.19, 0.85, 5.7], [0, 11, 0])
  place('models/Bottle_Sake.glb', [10.27, 0.85, 5.8], [0, -27, 0], [0.5, 0.5, 0.5])

  // Pendant lights over tables
  place('models/Chandelier 1.glb', [6.24, 3.2, 8.67], [0, 0, 0], [0.4, 0.4, 0.4])
  place('models/Chandelier 1.glb', [9.68, 3.2, 8.74], [0, 0, 0], [0.4, 0.4, 0.4])

  // West wall decor — posters + sconces
  place('models/Poster1.glb', [1.8, 1.8, 4], [0, 90, 0])
  place('models/Poster3.glb', [1.8, 1.8, 7.5], [0, 90, 0])
  place('models/Poster5.glb', [1.8, 1.8, 11], [0, 90, 0])
  place('models/Light Wall.glb', [1.8, 2.5, 4.5], [0, 90, 0])
  place('models/Light Wall.glb', [1.8, 2.5, 10.5], [0, 90, 0])

  // Floor rug
  place('models/Carpet_03.glb', [4.47, 0.01, 6.62], [0, -53, 0], [2, 1, 2])

  // === ZONE: Bar Counter (north wall — FOCAL POINT) ===
  place('models/Furnit Bar 2 3M.glb', [6, 0, 15.7], [0, 180, 0])
  place('models/Furnit Bar 1 2M.glb', [9, 0, 15.7], [0, 180, 0])
  place('models/Furnit Bar 3 1M.glb', [11, 0, 15.7], [0, 180, 0])

  // Bar stools (6 across)
  place('models/Bar Stool.glb', [5, 0, 14.7], [0, 72, 0])
  place('models/Bar Stool.glb', [6.2, 0, 14.7], [0, 61, 0])
  place('models/Bar Stool.glb', [7.4, 0, 14.7], [0, 31, 0])
  place('models/Bar Stool.glb', [8.6, 0, 14.7], [0, -31, 0])
  place('models/Bar Stool.glb', [9.8, 0, 14.7], [0, -61, 0])
  place('models/Bar Stool.glb', [11, 0, 14.7], [0, -72, 0])

  // Beer taps
  place('models/Drinks_Dispenser_Black.glb', [7, 0.85, 15.56], [0, -5, 0], [0.5, 0.5, 0.5])
  place('models/Drinks_Dispenser_Black.glb', [8, 0.85, 15.58], [0, 25, 0], [0.5, 0.5, 0.5])
  place('models/Drinks_Dispenser_Pink.glb', [9, 0.85, 15.7], [0, -16, 0], [0.5, 0.5, 0.5])

  // Glasses on bar
  place('models/Soup_Bowl.glb', [6.5, 0.85, 15.8], [0, -18, 0], [0.4, 0.4, 0.4])
  place('models/Milk 2.glb', [7.5, 0.85, 15.64], [0, -2, 0], [0.5, 0.5, 0.5])
  place('models/Soup_Bowl.glb', [8.5, 0.85, 15.59], [0, 10, 0], [0.4, 0.4, 0.4])
  place('models/Milk 1.glb', [9.5, 0.85, 15.79], [0, -3, 0], [0.5, 0.5, 0.5])

  // Liquor shelf + bottles behind bar
  place('models/Furnit Bar 4 2M.glb', [8, 1.8, 15.7], [0, 180, 0])
  place('models/WineBottle_01.glb', [6.5, 2.1, 15.8], [0, -11, 0])
  place('models/Bottle_Sake.glb', [7.2, 2.1, 15.66], [0, -13, 0])
  place('models/WineBottle_01.glb', [7.9, 2.1, 15.69], [0, 10, 0])
  place('models/Bottle_06.glb', [8.6, 2.1, 15.62], [0, -23, 0])
  place('models/Bottle_Sake.glb', [9.3, 2.1, 15.67], [0, 6, 0])
  place('models/WineBottle_01.glb', [10, 2.1, 15.59], [0, 17, 0])

  // Pendant light above bar
  place('models/Chandelier 2.glb', [8, 2.6, 15.2], [0, 0, 0], [0.5, 0.5, 0.5])

  // TV behind bar
  place('models/Display_Monitor.glb', [8, 2.2, 15.7], [0, 180, 0], [2, 2, 2])

  // === ZONE: TV Wall East ===
  place('models/Display_Monitor.glb', [15.7, 2, 8], [0, -90, 0], [3, 3, 3])   // big screen
  place('models/Sofa_Black.glb', [13, 0, 8], [0, 90, 0])                       // sofa
  place('models/Coffee_Table.glb', [14.2, 0, 8], [0, 90, 0])                   // coffee table
  place('models/Cigarettes.glb', [14.12, 0.45, 7.9], [0, 27, 0])              // remotes
  place('models/Boombox_01.glb', [15.7, 2.8, 10], [0, -90, 0])                // speaker

  // === ZONE: Corner SW — Arcade ===
  place('models/Arcade_Machine_Black.glb', [1, 0, 0.3])
  place('models/Arcade_Machine_Red.glb', [2.5, 0, 0.3], [0, -2, 0])
  place('models/Fliptop_Bin.glb', [0.5, 0, 2], [0, 58, 0])

  // === ZONE: Corner NW — Pool Table ===
  place('models/Table 3.glb', [2.5, 0, 14.5], [0, -40, 0], [1.5, 0.9, 0.8])
  place('models/Light Wheel.glb', [2.5, 2.5, 14.5])                             // pendant
  place('models/Barrel 1.glb', [0.5, 0, 15.5])                                  // barrel as cue rack

  // === ZONE: Corner SE — Jukebox ===
  place('models/Arcade_Machine_Blue.glb', [15.5, 0, 0.5], [0, 125, 0])
  place('models/Neon_Oval_Sign.glb', [15.7, 2.5, 1], [0, -90, 0])

  // === EXTRA DETAILS ===
  // Neon tubes (cyberpunk ceiling accents)
  place('models/Neon_Tube_Blue.glb', [8, 3.8, 0.5], [0, 0, 0], [4, 1, 1])
  place('models/Neon_Tube_Red.glb', [8, 3.8, 15.5], [0, 0, 0], [4, 1, 1])
  // Barrels near entrance
  place('models/Barrel 1.glb', [3, 0, 0.5], [0, 15, 0])
  place('models/Barrel 2.glb', [12, 0, 0.5], [0, -10, 0])
  // Books on shelf
  place('models/Books.glb', [11, 2.1, 15.65], [0, 180, 0])
  // Piano
  place('models/Piano.glb', [0.8, 0, 12], [0, 90, 0])

  console.log('🏈 Fourth & Goal Sports Bar loaded')
}
