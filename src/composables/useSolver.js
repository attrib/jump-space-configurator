import { useGridStore } from '../stores/gridStore'

export function useSolver() {
  const gridStore = useGridStore()

  /**
   * @param {Part} part
   * @param {int} x
   * @param {int} y
   * @param {int} rotation
   * @param {Set<string>} occupied
   * @returns {boolean}
   */
  function canPlace(part, x, y, rotation, occupied) {
    for (const [sx, sy] of part.shape) {
      let tx = sx, ty = sy
      const r = rotation % 4
      if (r === 1) { tx = sy; ty = -sx }
      if (r === 2) { tx = -sx; ty = -sy }
      if (r === 3) { tx = -sy; ty = sx }
      const gx = x + tx
      const gy = y + ty
      if (gx < 0 || gy < 0 || gx >= 8 || gy >= 8) return false
      if (gridStore.grid[gy][gx] === -1) return false
      if (occupied.has(gx + ',' + gy)) return false
    }
    return true
  }

  /**
   * @param {Part} part
   * @param {int} x
   * @param {int} y
   * @param {int} rotation
   * @returns {int[int[]]}
   */
  function getCells(part, x, y, rotation) {
    const cells = []
    for (const [sx, sy] of part.shape) {
      let tx = sx, ty = sy
      const r = rotation % 4
      if (r === 1) { tx = sy; ty = -sx }
      if (r === 2) { tx = -sx; ty = -sy }
      if (r === 3) { tx = -sy; ty = sx }
      cells.push([x + tx, y + ty])
    }
    return cells
  }

  /**
   * @param {Part} part
   * @param {Set<string>} occupied
   * @returns {{part: Part, x: int, y: int, rotation: int, cells: int[int[]]}[]}
   */
  function enumeratePlacements(part, occupied) {
    const placements = []
    for (let r = 0; r < 4; r++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (canPlace(part, x, y, r, occupied)) {
            placements.push({ 
              part, x, y, rotation: r, 
              cells: getCells(part, x, y, r) 
            })
          }
        }
      }
    }
    return placements
  }

  /**
   * @param {Placeable[]} partsToPlace
   * @param {Set<string>} occupied
   * @returns {null|{part: Part, x: int, y: int, rotation: int, cells: int[int[]]}[][]}
   */
  function solveBacktracking(partsToPlace, occupied) {
    if (partsToPlace.length === 0) return []
    
    let bestIdx = -1
    let bestOptions = null
    let bestPlacements = null
    
    for (let i = 0; i < partsToPlace.length; i++) {
      const opts = enumeratePlacements(partsToPlace[i], occupied)
      if (opts.length === 0) return null
      if (bestOptions === null || opts.length < bestOptions) {
        bestOptions = opts.length
        bestIdx = i
        bestPlacements = opts
        if (bestOptions === 1) break
      }
    }

    const nextParts = partsToPlace.slice()
    const part = nextParts.splice(bestIdx, 1)[0]
    
    for (const plc of bestPlacements) {
      const newly = []
      for (const c of plc.cells) newly.push(c[0] + ',' + c[1])
      for (const key of newly) occupied.add(key)
      
      const sub = solveBacktracking(nextParts, occupied)
      if (sub) return [plc, ...sub]
      
      for (const key of newly) occupied.delete(key)
    }
    return null
  }

  function solve() {
    const remaining = gridStore.placeables.slice()
    if (remaining.length === 0) {
      return { success: false, message: 'Nothing to place: selection is empty.' }
    }

    const occupied = new Set()
    for (const pl of gridStore.placed) {
      for (const c of pl.cells) occupied.add(c[0] + ',' + c[1])
    }

    const solution = solveBacktracking(remaining, occupied)
    if (!solution) {
      return { 
        success: false, 
        message: 'No complete solution found for the current selection and grid.' 
      }
    }

    return { success: true, solution }
  }

  return {
    solve,
  }
}
