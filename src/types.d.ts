// Central domain types for Jump Space Configurator
// Lightweight declaration file to power JSDoc-based type hints in plain JS/Vue SFCs.

export type Cell = [number, number]
export type Grid = number[][]

export interface Part {
  id: string
  name: string
  // Examples: "Sensors", "Engines", "Pilot Cannon", "Multi Turret Systems", "Special Weapons"
  type: string
  // Normalized list of occupied cells relative to a local origin
  shape: Cell[]
}

// A concrete selectable instance of a Part assigned to a specific ship slot index
export interface Placeable extends Part {
  idx: number
}

// A part as placed on the 8x8 board
export interface PlacedPart {
  // Combined type + index, e.g. "Engines_0"
  id: string
  partId: string
  name: string
  cells: Cell[]
}

export interface ShipTier {
  // Number of slots by role for a specific tier
  sensor: number
  engine: number
  pilotCannon: number
  multiTurretSystem: number
  specialWeapon: number
  jumpDrive: number
}

export interface Ship {
  id: string
  name: string
  tiers: Record<TierKey, ShipTier>
}

// Power units define buildable/blocked cells by an 8-char wide pattern per row
export type TierKey = string // e.g., "T1", "T2", "T3"

export interface TieredShape {
  shape: string[]
}

export interface Reactor {
  id: string // base id, e.g., "split_reactor"
  name: string // base name, e.g., "Split Reactor"
  tiers: Record<TierKey, TieredShape>
}

export interface Auxiliary {
  id: string // base id, e.g., "bio_fission_generator"
  name: string // base name without tier suffix
  tiers: Record<TierKey, TieredShape>
}

export interface DataShape {
  parts: Part[]
  reactors: Reactor[]
  auxiliaries: Auxiliary[]
  ships: Ship[]
}

export interface TryPlacePayload {
  part: Placeable
  x: number
  y: number
  rotation: number // 0..3 (quarter turns)
}
