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
      st: shipStore.shipTier,
      r: shipStore.reactorId,
      rt: shipStore.reactorTier,
      a1: shipStore.aux1Id,
      a1t: shipStore.aux1Tier,
      a2: shipStore.aux2Id,
      a2t: shipStore.aux2Tier,
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

  // Map legacy per-tier IDs like "split_reactor_t2" to { id: "split_reactor", tier: "T2" }
  function mapLegacyPowerId(id) {
    if (!id || id === 'none') return { id: 'none', tier: undefined }
    const m = /(.*)_t(\d+)$/i.exec(id)
    if (m) {
      return { id: m[1], tier: 'T' + m[2] }
    }
    return { id, tier: undefined }
  }

  // Map legacy ship IDs like "catamaran-t1" to { id: "catamaran", tier: "T1" }
  function mapLegacyShipId(id) {
    if (!id) return { id: undefined, tier: undefined }
    const m = /(.*)-t(\d+)$/i.exec(id)
    if (m) {
      return { id: m[1], tier: 'T' + m[2] }
    }
    return { id, tier: undefined }
  }

  function applyState(state) {
    if (!state) return
    suppressUrlUpdate = true
    try {
      // Apply ship & power
      let shipId = state.ship
      let shipTier = state.st
      if (!shipTier) {
        const mapped = mapLegacyShipId(state.ship)
        shipId = mapped.id
        shipTier = mapped.tier || 'T0'
      }
      if (shipId && shipStore.availableShips.some(s => s.id === shipId)) {
        shipStore.setShip(shipId)
        if (shipTier) shipStore.setShipTier(shipTier)
      }

      // Reactor
      let rid = state.r
      let rt = state.rt
      if (!rt) {
        const mapped = mapLegacyPowerId(state.r)
        rid = mapped.id
        rt = mapped.tier || 'T1'
      }
      if (rid && shipStore.reactors.some(r => r.id === rid)) {
        shipStore.setReactor(rid)
        if (rt) shipStore.setReactorTier(rt)
      } else {
        shipStore.setReactor('none')
      }

      // Aux 1
      let a1id = state.a1
      let a1t = state.a1t
      if (!a1t) {
        const mapped = mapLegacyPowerId(state.a1)
        a1id = mapped.id
        a1t = mapped.tier || 'T1'
      }
      if (a1id && shipStore.auxiliaries.some(a => a.id === a1id)) {
        shipStore.setAux1(a1id)
        if (a1t) shipStore.setAux1Tier(a1t)
      } else {
        shipStore.setAux1('none')
      }

      // Aux 2
      let a2id = state.a2
      let a2t = state.a2t
      if (!a2t) {
        const mapped = mapLegacyPowerId(state.a2)
        a2id = mapped.id
        a2t = mapped.tier || 'T1'
      }
      if (a2id && shipStore.auxiliaries.some(a => a.id === a2id)) {
        shipStore.setAux2(a2id)
        if (a2t) shipStore.setAux2Tier(a2t)
      } else {
        shipStore.setAux2('none')
      }

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
        () => shipStore.shipTier,
        () => shipStore.reactorId,
        () => shipStore.reactorTier,
        () => shipStore.aux1Id,
        () => shipStore.aux1Tier,
        () => shipStore.aux2Id,
        () => shipStore.aux2Tier
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