import { useGridStore } from '../stores/gridStore'
import { useShipStore } from '../stores/shipStore'
import { usePartsStore } from '../stores/partsStore'

export function useGridManager() {
  const gridStore = useGridStore()
  const shipStore = useShipStore()
  const partsStore = usePartsStore()

  /**
   * Apply holes/power cells from reactor and auxiliaries
   */
  function applyHoles() {
    const newGrid = Array.from({ length: 8 }, () => Array(8).fill(-1))

    applyHolesFor(
      shipStore.reactors,
      shipStore.reactorId,
      0,
      newGrid
    )
    applyHolesFor(
      shipStore.auxiliaries,
      shipStore.aux1Id,
      4,
      newGrid
    )
    applyHolesFor(
      shipStore.auxiliaries,
      shipStore.aux2Id,
      6,
      newGrid
    )

    gridStore.updateGrid(newGrid)
    checkAll()
  }

  /**
   * Clear all placed parts and return them to placeables
   */
  function resetBoard() {
    const placed = gridStore.placed
    for (const p of placed) {
      const part = partsStore.getPartById(p.partId)
      if (part) {
        const idx = parseInt(p.id.split('_')[1])
        gridStore.addPlaceable({ ...part, idx: idx })
      }
    }
    gridStore.placed.splice(0, gridStore.placed.length)
  }

  /**
   * Check if placed and placables are still valid (e.g. ship changed, reactor changed)
   */
  function checkAll() {
    const currentShip = shipStore.selectedShip
    const placed = gridStore.placed
    const placables = gridStore.placeables

    const removePlaced = []
    for (const [i, p] of placed.entries()) {
      // remove placed parts, which are not valid anymore due to ship configuration
      const idx = parseInt(p.id.split('_')[1])
      const shipKey = partsStore.getShipKeyByPartType(p.id.split('_')[0])
      if (idx >= currentShip[shipKey]) {
        removePlaced.push(i)
      }
      // move place parts, which are not valid anymore due to grid layout change
      else {
        if (!validatePlacement(p.cells, p.id)) {
          const base = partsStore.getPartById(p.partId)
          removePlaced.push(i)
          if (base) {
            const part = {...base, idx: idx}
            gridStore.addPlaceable(part)
          }
        }
      }
    }
    for (const i of removePlaced.sort().reverse()) {
      gridStore.placed.splice(i, 1)
    }

    const removePlacables = []
    for (const [i, p] of placables.entries()) {
      const shipKey = partsStore.getShipKeyByPartType(p.type)
      if (p.idx >= currentShip[shipKey]) {
        removePlacables.push(i)
      }
    }
    for (const i of removePlacables.sort().reverse()) {
      gridStore.placeables.splice(i, 1)
    }
  }

  /**
   * Apply holes from a specific reactor or auxiliary
   */
  function applyHolesFor(list, selected, offsetY, newGrid) {
    const item = list.find(i => i.id === selected)
    if (!item) return

    for (const [y, line] of item.shape.entries()) {
      for (let x = 0; x < 8; x++) {
        const ch = line[x]
        if (ch === 'U') newGrid[y + offsetY][x] = 0
        if (ch === 'P') newGrid[y + offsetY][x] = 1
      }
    }
  }

  function validatePlacement(coords, id) {
    for (const [gx, gy] of coords) {
      if (gx < 0 || gy < 0 || gx >= 8 || gy >= 8) {
        return false
      }
      if (gridStore.grid[gy][gx] === -1) {
        return false
      }
      // Check collision with already placed parts
      for (const pl of gridStore.placed) {
        for (const c of pl.cells) {
          if (c[0] === gx && c[1] === gy && (!id || pl.id !== id)) {
            return false
          }
        }
      }
    }
    return true
  }

  /**
   * Try to place a part on the grid
   * @param {TryPlacePayload} payload
   */
  function tryPlace(payload) {
    const { part, x, y, rotation } = payload
    const coords = []

    // Calculate rotated coordinates
    for (const [sx, sy] of part.shape) {
      let tx = sx, ty = sy
      const r = rotation % 4
      if (r === 1) {
        tx = sy
        ty = -sx
      }
      if (r === 2) {
        tx = -sx
        ty = -sy
      }
      if (r === 3) {
        tx = -sy
        ty = sx
      }
      coords.push([x + tx, y + ty])
    }

    if (!validatePlacement(coords)) {
      return {ok: false}
    }

    // Place the part
    const id = part.type + '_' + part.idx
    const cells = coords.map(c => [...c])
    gridStore.addPlaced({
      id,
      partId: part.id,
      name: part.name,
      cells
    })

    // Remove from placeables
    const idxPl = gridStore.placeables.findIndex(
      pp => pp.id === part.id && pp.idx === part.idx
    )
    if (idxPl !== -1) {
      gridStore.placeables.splice(idxPl, 1)
    }

    return { ok: true, id }
  }

  /**
   * Move a placed part (remove and make draggable)
   * @param {PlacedPart} placedPart
   */
  function movePlaced(placedPart) {
    const idx = gridStore.placed.findIndex(p => p.id === placedPart.id)
    if (idx === -1) return

    gridStore.placed.splice(idx, 1)

    const base = partsStore.getPartById(placedPart.partId)
    if (!base) return

    const slotIdx = String(placedPart.id).split('_')[1]
    const part = { ...base, idx: parseInt(slotIdx) }

    gridStore.addPlaceable(part)

    // Trigger drag start event
    document.dispatchEvent(
      new CustomEvent('jumpspace-drag-start', {
        detail: { part },
        bubbles: true
      })
    )
  }

  return {
    applyHoles,
    tryPlace,
    movePlaced,
    resetBoard,
    checkAll
  }
}