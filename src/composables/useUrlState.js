import { watch } from 'vue'
import { useShipStore } from '../stores/shipStore'
import { useGridStore } from '../stores/gridStore'
import { usePartsStore } from '../stores/partsStore'
import { useGridManager } from './useGridManager'

export function useUrlState() {
  const shipStore = useShipStore()
  const gridStore = useGridStore()
  const partsStore = usePartsStore()
  const { applyHoles } = useGridManager()

  let suppressUrlUpdate = false
  let urlTimer = null

  function encodeState(obj) {
    try {
      const json = JSON.stringify(obj)
      return btoa(unescape(encodeURIComponent(json)))
    } catch (e) {
      try { return btoa(JSON.stringify(obj)) } catch (e2) { return '' }
    }
  }

  function decodeState(str) {
    try {
      const json = decodeURIComponent(escape(atob(str)))
      return JSON.parse(json)
    } catch (e) {
      try { return JSON.parse(atob(str)) } catch (e2) { return null }
    }
  }

  function buildState() {
    return {
      ship: shipStore.shipId,
      r: shipStore.reactorId,
      a1: shipStore.aux1Id,
      a2: shipStore.aux2Id,
      pl: gridStore.placeables.map(p => ({ id: p.id, idx: p.idx })),
      pd: gridStore.placed.map(p => ({
        partId: p.partId,
        idx: parseInt(String(p.id).split('_')[1]),
        cells: p.cells
      }))
    }
  }

  function updateUrl() {
    if (suppressUrlUpdate) return
    const enc = encodeState(buildState())
    const newHash = '#s=' + enc
    if (location.hash !== newHash) {
      const url = location.pathname + location.search + newHash
      history.replaceState(null, '', url)
    }
  }

  function scheduleUrlUpdate() {
    if (suppressUrlUpdate) return
    if (urlTimer) clearTimeout(urlTimer)
    urlTimer = setTimeout(updateUrl, 150)
  }

  function applyState(state) {
    if (!state) return
    suppressUrlUpdate = true
    try {
      // Apply ship & power
      if (state.ship && shipStore.availableShips.some(s => s.id === state.ship)) {
        shipStore.setShip(state.ship)
      }
      shipStore.setReactor(
        state.r && shipStore.reactors.some(r => r.id === state.r)
          ? state.r : 'none'
      )
      shipStore.setAux1(
        state.a1 && shipStore.auxiliaries.some(a => a.id === state.a1)
          ? state.a1 : 'none'
      )
      shipStore.setAux2(
        state.a2 && shipStore.auxiliaries.some(a => a.id === state.a2)
          ? state.a2 : 'none'
      )

      applyHoles()

      // Apply placeables
      gridStore.placeables.splice(0, gridStore.placeables.length)
      if (Array.isArray(state.pl)) {
        for (const p of state.pl) {
          const base = partsStore.getPartById(p.id)
          if (base) gridStore.addPlaceable({ ...base, idx: p.idx })
        }
      }

      // Apply placed
      gridStore.placed.splice(0, gridStore.placed.length)
      if (Array.isArray(state.pd)) {
        for (const p of state.pd) {
          const base = partsStore.getPartById(p.partId)
          if (base && Array.isArray(p.cells)) {
            const id = base.type + '_' + p.idx
            gridStore.addPlaced({
              id,
              partId: base.id,
              name: base.name,
              cells: p.cells.map(c => [c[0], c[1]])
            })
          }
        }
      }

      document.dispatchEvent(new CustomEvent('apply-state', {}))
    } finally {
      suppressUrlUpdate = false
    }
    updateUrl()
  }

  function initializeFromUrl() {
    const m = /^#s=(.+)$/.exec(location.hash || '')
    if (m && m[1]) {
      const st = decodeState(m[1])
      if (st) applyState(st)
    } else {
      updateUrl()
    }
  }

  function setupWatchers() {
    watch(
      [
        () => shipStore.shipId,
        () => shipStore.reactorId,
        () => shipStore.aux1Id,
        () => shipStore.aux2Id
      ],
      scheduleUrlUpdate
    )
    watch(() => gridStore.placeables, scheduleUrlUpdate, { deep: true })
    watch(() => gridStore.placed, scheduleUrlUpdate, { deep: true })
  }

  return {
    initializeFromUrl,
    setupWatchers
  }
}