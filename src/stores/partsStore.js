import { defineStore } from 'pinia'
import {computed, ref} from 'vue'
import data from '../data/parts.json'

/** @typedef {import('../types').Part} Part */

export const usePartsStore = defineStore('parts', () => {
  /** @type {Part[]} */
  const parts = ref([])
  const typeMap = [
    { shipKey: 'jumpDrive', label: 'Jump Drives', partType: 'Jump Drives' },
    { shipKey: 'sensor', label: 'Sensor', partType: 'Sensors' },
    { shipKey: 'engine', label: 'Engine', partType: 'Engines' },
    { shipKey: 'pilotCannon', label: 'Pilot Cannon', partType: 'Pilot Cannon' },
    { shipKey: 'multiTurretSystem', label: 'Multi Turret System', partType: 'Multi Turret Systems' },
    { shipKey: 'specialWeapon', label: 'Special Weapon', partType: 'Special Weapons' }
  ]

  /**
   * @param {Part} part
   */
  function parseShape(part) {
    const shape = []
    for (let y = 0; y < part.shape.length; y++) {
      for (let x = 0; x < part.shape[y].length; x++) {
        if (part.shape[y][x] === 'X') {
          shape.push([x, y])
        }
      }
    }
    part.shape = shape
  }

  function initializeParts() {
    parts.value = data.parts
    for (const part of parts.value) {
      parseShape(part)
    }
  }

  const partsByType = computed(() => {
    const map = {}
    for (const p of (parts.value || [])) {
      if (!map[p.type]) map[p.type] = []
      map[p.type].push(p)
    }
    return map
  })

  /**
   * @param {string} id
   * @returns {Part|undefined}
   */
  function getPartById(id) {
    return parts.value.find((part) => part.id === id)
  }

  function getShipKeyByPartType(partType) {
    const cfg = typeMap.find((t) => t.partType === partType)
    if (cfg) {
      return cfg.shipKey
    }
  }


  // Initialize immediately
  initializeParts()

  return {
    parts,
    partsByType,
    getPartById,
    typeMap,
    getShipKeyByPartType
  }
})