<template>
  <div>
    <div>Nodes total {{ stats.total }} / needed {{ stats.needed }} / open {{ stats.open }}</div>
    <div style="margin-bottom:8px;font-weight:bold">Select parts by type</div>
    <template v-for="cfg in typeMap">
      <div :key="cfg.shipKey" style="margin:6px 0" v-if="(ship && ship[cfg.shipKey] ? ship[cfg.shipKey] : 0) > 0">
        <div style="font-size:13px;color:#ccc;margin-bottom:4px">{{ cfg.label }}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap">
          <div v-for="(n, idx) in (ship && ship[cfg.shipKey] ? ship[cfg.shipKey] : 0)" :key="cfg.shipKey+'-'+idx" style="display:flex; gap:6px; align-items:center">
            <select v-model="selections[cfg.shipKey][idx]" @change="onSelect(cfg, idx)" style="min-width:180px">
              <option value="" v-if="cfg.shipKey !== 'jumpDrive'">None</option>
              <option v-for="p in partBasesByType[cfg.partType]" :value="p.id">{{ p.name }}</option>
            </select>
            <select v-if="selections[cfg.shipKey][idx] && (tiersForBase(selections[cfg.shipKey][idx]) || []).length > 1"
                    v-model="selectionsTier[cfg.shipKey][idx]" @change="onSelect(cfg, idx)">
              <option v-for="t in tiersForBase(selections[cfg.shipKey][idx])" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>
      </div>
    </template>

    <div style="margin-top:12px;font-weight:bold">Placeables</div>
    <div v-if="placeables && placeables.length === 0" style="font-size:13px;color:#777">No parts to add to ship.</div>
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:6px;max-width:800px">
      <div v-for="(p, i) in placeables" :key="'pl-'+i"
           class="placeable"
           :style="{border:'1px solid #3a4257', padding:'6px', display:'inline-flex', gap:'8px', alignItems:'center', background:'#232a3b', borderRadius:'4px'}"
           @pointerdown.prevent="startDrag(p)">
        <div>
          <svg :width="previewSize(p).w" :height="previewSize(p).h" style="background:#161b27;border-radius:2px">
            <rect v-for="(c, idx) in normalizedCells(p)" :key="'c'+idx"
                  :x="c[0]*cell" :y="c[1]*cell" :width="cell" :height="cell" fill="#bfe6ffcc" stroke="#000"/>
          </svg>
        </div>
        <div style="min-width:160px">
          <div style="font-weight:600">{{ p.name }}</div>
          <div style="font-size:12px;color:#9aa4bd">{{ p.type }}</div>
        </div>
        <button title="Remove" @click.stop="remove(i)">✕</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, reactive, watchEffect } from 'vue'
import { usePartsStore } from '../stores/partsStore'

/** @typedef {import('../types').Ship} Ship */
/** @typedef {import('../types').Grid} Grid */
/** @typedef {import('../types').Part} Part */
/** @typedef {import('../types').Placeable} Placeable */
/** @typedef {import('../types').PlacedPart} PlacedPart */

export default {
  name: 'SelectionArea',
  /** @param {{ship: Ship, placed: PlacedPart[], placeables: Placeable[], grid: Grid}} props */
  props: {ship: Object, placed: Array, placeables: Array, grid: Array},
  emits: ['add-placeable', 'remove-placeable', 'clear-placeable'],
  setup(props, {emit}) {
    const selections = reactive({}) // base ids per slot
    const selectionsTier = reactive({}) // tier per slot
    const partStore = usePartsStore()
    const partBasesByType = partStore.partBasesByType
    const typeMap = partStore.typeMap

    const stats = computed(() => {
      const stats = { total: 0, needed: 0, open: 0 }
      for (const line of props.grid) stats.total += line.filter((x) => x >= 0).length
      for (const placed of props.placed) stats.needed += placed.cells.length
      for (const placable of props.placeables) stats.needed += placable.shape.length
      stats.open = stats.total - stats.needed
      return stats
    })

    onMounted(() => {
      document.addEventListener('apply-state', (ev) => {
        // Clear current selections for all slots, then rehydrate from placed/placeables
        for (const cfg of typeMap) {
          const count = props.ship && props.ship[cfg.shipKey] ? props.ship[cfg.shipKey] : 0
          if (!selections[cfg.shipKey]) selections[cfg.shipKey] = []
          if (!selectionsTier[cfg.shipKey]) selectionsTier[cfg.shipKey] = []
          for (let i = 0; i < count; i++) {
            selections[cfg.shipKey][i] = ''
            selectionsTier[cfg.shipKey][i] = ''
          }
        }
        for (const placed of props.placed) {
          const [partType, idx] = placed.id.split('_')
          const shipKey = partStore.getShipKeyByPartType(partType)
          if (!selections[shipKey]) selections[shipKey] = []
          if (!selectionsTier[shipKey]) selectionsTier[shipKey] = []
          const baseId = partStore.getBaseId(placed.partId)
          const tier = partStore.getTierFromId(placed.partId)
          selections[shipKey][idx] = baseId
          selectionsTier[shipKey][idx] = tier
        }
        for (const placable of props.placeables) {
          const shipKey = partStore.getShipKeyByPartType(placable.type)
          if (!selections[shipKey]) selections[shipKey] = []
          if (!selectionsTier[shipKey]) selectionsTier[shipKey] = []
          const baseId = partStore.getBaseId(placable.id)
          const tier = partStore.getTierFromId(placable.id)
          selections[shipKey][placable.idx] = baseId
          selectionsTier[shipKey][placable.idx] = tier
        }
      })
    })

    // Ensure selection arrays have the right length when ship changes
    watchEffect(() => {
      for (const cfg of typeMap) {
        const count = props.ship && props.ship[cfg.shipKey] ? props.ship[cfg.shipKey] : 0
        if (!selections[cfg.shipKey]) selections[cfg.shipKey] = []
        if (!selectionsTier[cfg.shipKey]) selectionsTier[cfg.shipKey] = []
        const arr = selections[cfg.shipKey]
        const arrT = selectionsTier[cfg.shipKey]
        // Resize
        if (arr.length > count) arr.splice(count)
        while (arr.length < count) arr.push('')
        if (arrT.length > count) arrT.splice(count)
        while (arrT.length < count) arrT.push('')
        // Reset values that no longer exist in options
        for (let i = 0; i < arr.length; i++) {
          const baseId = arr[i]
          const options = partBasesByType[cfg.partType] || []
          if (baseId && !options.some(p => p.id === baseId)) arr[i] = ''
          // also ensure tier is valid for selected base
          const tiers = baseId ? (partStore.tiersForBase(baseId) || []) : []
          if (arrT[i] && (!tiers.length || !tiers.includes(arrT[i]))) {
            arrT[i] = tiers.length ? tiers[0] : ''
          }
        }
      }
    })

    function onSelect(cfg, idx) {
      const baseId = selections[cfg.shipKey][idx]
      if (!baseId) {
        emit('clear-placeable', {type: cfg.partType, idx})
        return
      }
      let tier = selectionsTier[cfg.shipKey][idx]
      const tiers = partStore.tiersForBase(baseId) || []
      if (!tier && tiers.length) {
        tier = tiers[0]
        selectionsTier[cfg.shipKey][idx] = tier
      }
      const part = partStore.getConcretePart(baseId, tier)
      if (!part) {
        emit('clear-placeable', {type: cfg.partType, idx})
        return
      }

      // Determine previously active concrete selection for this slot (from placeables or placed)
      let prevConcreteId = undefined
      let prevShape = undefined
      const placeIdx = props.placeables.findIndex(pp => (pp.type === cfg.partType && pp.idx === idx))
      if (placeIdx !== -1) {
        prevConcreteId = props.placeables[placeIdx].id
        prevShape = props.placeables[placeIdx].shape
      } else {
        const placedIdx = props.placed.findIndex(pp => pp.id === (cfg.partType + '_' + idx))
        if (placedIdx !== -1) {
          const prevBase = partStore.getPartById(props.placed[placedIdx].partId)
          if (prevBase) {
            prevConcreteId = prevBase.id
            prevShape = prevBase.shape
          }
        }
      }

      // If this is a pure tier change (same base) and shape didn't change, do not emit
      if (prevConcreteId) {
        const prevBaseId = partStore.getBaseId(prevConcreteId)
        if (prevBaseId === baseId) {
          const newShape = part.shape || []
          const a = (prevShape || []).slice().sort((p1, p2) => (p1[0]-p2[0]) || (p1[1]-p2[1]))
          const b = (newShape || []).slice().sort((p1, p2) => (p1[0]-p2[0]) || (p1[1]-p2[1]))
          const same = a.length === b.length && a.every((c, i) => c[0] === b[i][0] && c[1] === b[i][1])
          if (same) return
        }
      }

      const clonedPart = {...part, shape: part.shape ? [...part.shape] : []}
      clonedPart.idx = idx
      // decorate name with tier for clarity if multiple tiers
      if (tiers.length && tier) clonedPart.name = `${clonedPart.name.replace(/\s*T\d+$/i,'')} ${tier}`
      emit('add-placeable', clonedPart)
    }

    const cell = 12 // preview cell size

    function normalizedCells(part) {
      // Normalize the part.shape cells to start at (0,0)
      const cells = part.shape || []
      if (!cells.length) return []
      let minX = Infinity, minY = Infinity
      let maxX = -Infinity, maxY = -Infinity
      for (const [x, y] of cells) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      return cells.map(([x, y]) => [x - minX, y - minY])
    }

    function previewSize(part) {
      const cells = part.shape || []
      if (!cells.length) return {w: cell, h: cell}
      let minX = Infinity, minY = Infinity
      let maxX = -Infinity, maxY = -Infinity
      for (const [x, y] of cells) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      const w = (maxX - minX + 1) * cell
      const h = (maxY - minY + 1) * cell
      return {w, h}
    }

    function startDrag(part) {
      // trigger board drag
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur()
      }
      document.dispatchEvent(new CustomEvent('jumpspace-drag-start', {detail: {part}, bubbles: true}))
    }

    function remove(index) {
      const partType = props.placeables[index].type
      const shipKey = partStore.getShipKeyByPartType(partType)
      const partIdx = props.placeables[index].idx
      selections[shipKey][partIdx] = ''
      selectionsTier[shipKey][partIdx] = ''
      emit('remove-placeable', index)
    }

    return {typeMap, selections, selectionsTier, partBasesByType, tiersForBase: partStore.tiersForBase, onSelect, normalizedCells, previewSize, cell, startDrag, remove, stats}
  }
}
</script>