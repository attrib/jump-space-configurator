import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import data from '../data/parts.json'

/** @typedef {import('../types').Part} Part */

export const usePartsStore = defineStore('parts', () => {
  /** @type {Part[]} */
  const parts = ref([])

  // Map from baseId to list of concrete parts (per-tier variants)
  const baseIndex = ref({})

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
    // legacy string matrix to normalized cells
    for (let y = 0; y < part.shape.length; y++) {
      for (let x = 0; x < part.shape[y].length; x++) {
        if (part.shape[y][x] === 'X') shape.push([x, y])
      }
    }
    part.shape = shape
  }

  function getBaseId(id) {
    if (!id) return id
    const m = /(.*)_t(\d+)$/i.exec(id)
    return m ? m[1] : id
  }

  function getTierFromId(id) {
    const m = /(.*)_t(\d+)$/i.exec(id)
    return m ? ('T' + m[2]) : undefined
  }

  function buildBaseIndex() {
    const idx = {}
    for (const p of parts.value) {
      const baseId = getBaseId(p.id)
      if (!idx[baseId]) idx[baseId] = []
      idx[baseId].push(p)
    }
    // Sort tiers by numeric order if present
    for (const k of Object.keys(idx)) {
      idx[k].sort((a, b) => {
        const ta = getTierFromId(a.id)
        const tb = getTierFromId(b.id)
        const na = ta ? parseInt(ta.slice(1)) : 0
        const nb = tb ? parseInt(tb.slice(1)) : 0
        return na - nb
      })
    }
    baseIndex.value = idx
  }

  function initializeParts() {
    parts.value = data.parts
    for (const part of parts.value) parseShape(part)
    buildBaseIndex()
  }

  const partsByType = computed(() => {
    const map = {}
    for (const p of parts.value || []) {
      if (!map[p.type]) map[p.type] = []
      map[p.type].push(p)
    }
    return map
  })

  // Base options by type for UI (de-duplicated by baseId)
  const partBasesByType = computed(() => {
    const map = {}
    for (const p of parts.value || []) {
      if (!map[p.type]) map[p.type] = []
      const baseId = getBaseId(p.id)
      if (!map[p.type].some(b => b.id === baseId)) {
        // Clean name by removing trailing " Tn"
        const name = (p.name || '').replace(/\s*T\d+$/i, '')
        map[p.type].push({ id: baseId, name, type: p.type })
      }
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
    if (cfg) return cfg.shipKey
  }

  function tiersForBase(baseId) {
    const list = baseIndex.value[baseId] || []
    const tiers = list.map(p => getTierFromId(p.id)).filter(Boolean)
    // If no explicit tiers, return undefined to indicate single-variant
    return tiers.length ? tiers : undefined
  }

  function getConcretePart(baseId, tier) {
    const list = baseIndex.value[baseId] || []
    if (!list.length) return undefined
    if (!tier) return list[0]
    const num = parseInt(String(tier).replace(/^[^\d]*/, ''))
    const suffix = '_t' + (isFinite(num) ? num : tier)
    const id = baseId + suffix
    return list.find(p => p.id === id) || list[0]
  }

  // Initialize immediately
  initializeParts()

  return {
    parts,
    partsByType,
    partBasesByType,
    getPartById,
    getConcretePart,
    tiersForBase,
    getBaseId,
    getTierFromId,
    typeMap,
    getShipKeyByPartType
  }
})