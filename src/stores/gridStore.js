import { defineStore } from 'pinia'
import { reactive } from 'vue'

/** @typedef {import('../types').Grid} Grid */
/** @typedef {import('../types').PlacedPart} PlacedPart */
/** @typedef {import('../types').Placeable} Placeable */

export const useGridStore = defineStore('grid', () => {
  /** @type {Grid} */
  const grid = reactive(Array.from({ length: 8 }, () => Array(8).fill(-1)))
  /** @type {PlacedPart[]} */
  const placed = reactive([])
  /** @type {Placeable[]} */
  const placeables = reactive([])

  /**
   * @param {PlacedPart} item
   */
  function addPlaced(item) {
    placed.push(item)
  }

  /**
   * @param {Placeable} part
   */
  function addPlaceable(part) {
    placeables.push(part)
  }

  /**
   * Removes a placeable object from the list of placeables.
   *
   * @param {number|string|Placeable} payload Specifies the placeable to remove.
   * If a number, it represents the index of the placeable to remove.
   * If a string, it is interpreted as the `id` of the placeable.
   * If an object, the `id` property of the object is used to find the placeable to remove.
   * @return {void} Does not return a value.
   */
  function removePlaceable(payload) {
    if (typeof payload === 'number') {
      if (payload >= 0 && payload < placeables.length)
        placeables.splice(payload, 1)
    } else if (typeof payload === 'string') {
      const i = placeables.findIndex(p => p.id === payload)
      if (i !== -1) placeables.splice(i, 1)
    } else if (payload?.id) {
      const i = placeables.findIndex(p => p.id === payload.id)
      if (i !== -1) placeables.splice(i, 1)
    }
  }

  /**
   * @param {Grid} newGrid
   */
  function updateGrid(newGrid) {
    for (let y = 0; y < 8; y++) {
      grid[y] = newGrid[y]
    }
  }

  return {
    grid,
    placed,
    placeables,
    addPlaced,
    addPlaceable,
    removePlaceable,
    updateGrid
  }
})