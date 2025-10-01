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

export interface Ship {
  id: string
  name: string
  // Number of slots by role (may be omitted for ships that don’t support a role)
  sensor?: number
  engine?: number
  pilotCannon?: number
  multiTurretSystem?: number
  specialWeapon?: number
}

// Power units define buildable/blocked cells by an 8-char wide pattern per row
export interface Reactor {
  id: string
  name: string
  // Each string is 8 characters, containing letters like 'U' (usable) and 'P' (power?)
  shape: string[]
}

export interface Auxiliary {
  id: string
  name: string
  shape: string[]
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
