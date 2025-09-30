<template>
  <div>
    <div>Nodes total {{ stats.total }} / needed {{ stats.needed }} / open {{ stats.open }}</div>
    <div style="margin-bottom:8px;font-weight:bold">Select parts by type</div>
    <div v-for="cfg in typeMap" :key="cfg.shipKey" style="margin:6px 0">
      <div style="font-size:13px;color:#ccc;margin-bottom:4px">{{ cfg.label }}</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap">
        <select v-for="(n, idx) in (ship && ship[cfg.shipKey] ? ship[cfg.shipKey] : 0)" :key="cfg.shipKey+'-'+idx"
                v-model="selections[cfg.shipKey][idx]" @change="onSelect(cfg, idx)"
                style="min-width:180px">
          <option value="">None</option>
          <option v-for="p in partsByType[cfg.partType]" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
    </div>

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
import {computed, onMounted, reactive, watchEffect} from 'vue'

export default {
  name: 'SelectionArea',
  props: {ship: Object, placed: Array, parts: Array, placeables: Array, grid: Array},
  emits: ['add-placeable', 'remove-placeable', 'clear-placeable'],
  setup(props, {emit}) {
    const typeMap = [
      { shipKey: 'sensor', label: 'Sensor', partType: 'Sensors' },
      { shipKey: 'engine', label: 'Engine', partType: 'Engines' },
      { shipKey: 'pilotCannon', label: 'Pilot Cannon', partType: 'Pilot Cannon' },
      { shipKey: 'multiTurretSystem', label: 'Multi Turret System', partType: 'Multi Turret Systems' },
      { shipKey: 'specialWeapon', label: 'Special Weapon', partType: 'Special Weapons' }
    ]

    const selections = reactive({})

    // Build parts grouped by type for quick access
    const partsByType = computed(() => {
      const map = {}
      for (const p of (props.parts || [])) {
        if (!map[p.type]) map[p.type] = []
        map[p.type].push(p)
      }
      return map
    })

    const stats = computed(() => {
      const stats = {
        total: 0,
        needed: 0,
        open: 0,
      }
      for (const line of props.grid) {
        stats.total += line.filter((x) => x >= 0).length
      }
      for (const placed of props.placed) {
        stats.needed += placed.cells.length
      }
      for (const placable of props.placeables) {
        stats.needed += placable.shape.length
      }
      stats.open = stats.total - stats.needed
      return stats
    })

    onMounted(() => {
      document.addEventListener('apply-state', (ev) => {
        for (const placed of props.placed) {
          const [partType, idx] = placed.id.split('_')
          const cfg = typeMap.find((t) => t.partType === partType)
          if (!selections[cfg.shipKey]) selections[cfg.shipKey] = []
          selections[cfg.shipKey][idx] = placed.partId
        }
        for (const placable of props.placeables) {
          const cfg = typeMap.find((t) => t.partType === placable.type)
          if (!selections[cfg.shipKey]) selections[cfg.shipKey] = []
          selections[cfg.shipKey][placable.idx] = placable.id
        }
      })
    })

    // Ensure selection arrays have the right length when ship changes
    watchEffect(() => {
      for (const cfg of typeMap) {
        const count = props.ship && props.ship[cfg.shipKey] ? props.ship[cfg.shipKey] : 0
        if (!selections[cfg.shipKey]) selections[cfg.shipKey] = []
        const arr = selections[cfg.shipKey]
        // Resize
        if (arr.length > count) arr.splice(count)
        while (arr.length < count) arr.push('')
        // Reset values that no longer exist in options
        for (let i = 0; i < arr.length; i++) {
          const id = arr[i]
          if (id && !(partsByType.value[cfg.partType] || []).some(p => p.id === id)) {
            arr[i] = ''
          }
        }
      }
    })

    function onSelect(cfg, idx) {
      const id = selections[cfg.shipKey][idx]
      if (!id) {
        emit('clear-placeable', {type: cfg.partType, idx: idx})
        return
      }
      const part = (partsByType.value[cfg.partType] || []).find(p => p.id === id)
      if (!part) {
        emit('clear-placeable', {type: cfg.partType, idx: idx})
        return
      }
      const clonedPart = {...part, shape: part.shape ? [...part.shape] : []}
      clonedPart.idx = idx
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
      const res = cells.map(([x, y]) => [x - minX, y - minY])
      return res
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
      const cfg = typeMap.find((t) => t.partType === partType)
      const partIdx = props.placeables[index].idx
      selections[cfg.shipKey][partIdx] = ""
      emit('remove-placeable', index)
    }

    return {typeMap, selections, partsByType, onSelect, normalizedCells, previewSize, cell, startDrag, remove, stats}
  }
}
</script>