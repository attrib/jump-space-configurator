<template>
  <div>
    <h1>Jump Space — Ship Configurator</h1>
    <div class="app">
      <div class="sidebar">
        <h3 style="margin-top:12px">Select Ship</h3>
        <div>
          <label>Ship
            <select v-model="ship" @change="changeShip">
              <option v-for="s in availableShips" :value=s.id>{{ s.name }}</option>
            </select>
          </label>
        </div>

        <h3 style="margin-top:12px">Choose Reactor & Aux. Generator</h3>
        <div>
          <label>Reactor:
            <select v-model="reactor" @change="applyHoles">
              <option value="none">none</option>
              <option v-for="r in reactors" :value=r.id>{{ r.name }}</option>
            </select>
          </label>
        </div>
        <div style="margin-top:8px">
          <label>Aux 1:
            <select v-model="aux1" @change="applyHoles">
              <option value="none">none</option>
              <option v-for="a in auxiliaries" :value=a.id>{{ a.name }}</option>
            </select>
          </label>
        </div>
        <div style="margin-top:8px">
          <label>Aux 2:
            <select v-model="aux2" @change="applyHoles">
              <option value="none">none</option>
              <option v-for="a in auxiliaries" :value=a.id>{{ a.name }}</option>
            </select>
          </label>
        </div>

      </div>

      <div class="grid-area">
        <GridBoard ref="board" :grid="grid" :placed="placed" :cellSize="cellSize"
                   @try-place="tryPlace" @move-placed="movePlaced"/>
        <button style="margin-top:12px" @click="clearGrid">Clear Grid</button>
        <div style="margin-top:8px;font-size:13px;color:#444">
          Notes: This is a minimal client-side prototype. Rotate with R while dragging. Pieces cannot be placed on holes.
        </div>
      </div>

      <div class="selection-area">
        <SelectionArea :ship="selectedShip" :placed="placed" :parts="parts" :placeables="placeables" :grid="grid"
                       @add-placeable="onAddPlaceable" @remove-placeable="onRemovePlaceable"/>
      </div>
    </div>
    <div class="legal">
      Images and data are property of Keepsake Games<br>
      <a href="https://jumpspacegame.com/">Jump Space</a> are registered trademarks of Keepsake Games.
    </div>
  </div>
</template>

<script>
import GridBoard from './components/GridBoard.vue'
import SelectionArea from './components/SelectionArea.vue'
import {reactive, ref, watch, onMounted} from 'vue'
import data from './data/parts.json'

export default {
  components: {GridBoard, SelectionArea},
  setup() {
    const grid = reactive(Array.from({length: 8}, () => Array(8).fill(0)))
    const placed = reactive([])
    const placeables = reactive([])
    const ship = ref('catamaran-t0')
    const selectedShip  = reactive({})
    const reactor = ref('none')
    const aux1 = ref('none')
    const aux2 = ref('none')
    const cellSize = 48

    const parts = data.parts

    function parseShape(part) {
      let shape = [];
      for (let y = 0; y < part.shape.length; y++) {
        for (let x = 0; x < part.shape[y].length; x++) {
          if (part.shape[y][x] === 'X') {
            shape.push([x, y]);
          }
        }
      }
      part.shape = shape
    }

    for (let part of parts) {
      parseShape(part)
    }

    const reactors = data.reactors

    const auxiliaries = data.auxiliaries

    const availableShips = data.ships

    function changeShip() {
      const foundShip = availableShips.find((s) => s.id === ship.value)
      if (foundShip) {
        Object.assign(selectedShip, foundShip)
      }
    }

    changeShip()

    function applyHoles() {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) grid[y][x] = -1
      const newGrid = Array.from({length: 8}, () => Array(8).fill(-1))

      applyHolesFor(reactors, reactor.value, 0, newGrid)
      applyHolesFor(auxiliaries, aux1.value, 4, newGrid)
      applyHolesFor(auxiliaries, aux2.value, 6, newGrid)

      for (let y = 0; y < 8; y++) {
        grid[y] = newGrid[y]
      }
      resetBoard()
    }

    function resetBoard() {
      for (const p of placed) {
        const part = parts.find((part) => part.id === p.partId)
        const idx = p.id.split('_')[1]
        placeables.push({...part, idx: idx})
      }
      placed.splice(0, placed.length)
    }

    function applyHolesFor(list, selected, offsetY, newGrid) {
      const item = list.find(i => i.id === selected)
      if (!item) return
      for (let [y, line] of item.shape.entries()) {
        for (let x = 0; x < 8; x++) {
          const ch = line[x]
          if (ch === 'U') newGrid[y + offsetY][x] = 0
          if (ch === 'P') newGrid[y + offsetY][x] = 1
        }
      }
    }

    applyHoles()

    function clearGrid() {
      applyHoles()
    }

    function startDrag(e, part) {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur()
      }
      document.dispatchEvent(new CustomEvent('jumpspace-drag-start', {detail: {part}, bubbles: true}))
    }

    function tryPlace(payload) {
      const {part, x, y, rotation} = payload
      const coords = []
      for (const [sx, sy] of part.shape) {
        let tx = sx, ty = sy
        const r = rotation % 4
        if (r === 1) {
          tx = sy;
          ty = -sx
        }
        if (r === 2) {
          tx = -sx;
          ty = -sy
        }
        if (r === 3) {
          tx = -sy;
          ty = sx
        }
        coords.push([x + tx, y + ty])
      }
      const final = coords
      for (const [gx, gy] of final) {
        if (gx < 0 || gy < 0 || gx >= 8 || gy >= 8) return {ok: false}
        if (grid[gy][gx] === -1) return {ok: false}
        for (const pl of placed) {
          for (const c of pl.cells) {
            if (c[0] === gx && c[1] === gy) return {ok: false}
          }
        }
      }
      const id = part.type + '_' + part.idx
      const cells = final.map(c => c)
      placed.push({id, partId: part.id, name: part.name, cells})
      // Remove one matching part from placeables (first occurrence)
      const idxPl = placeables.findIndex(pp => pp.id === part.id && pp.idx === part.idx)
      if (idxPl !== -1) placeables.splice(idxPl, 1)
      return {ok: true, id}
    }

    function movePlaced(placedPart) {
      const idx = placed.findIndex(p => p.id === placedPart.id)
      if (idx !== -1) {
        placed.splice(idx, 1)
        const base = parts.find(p => p.id === placedPart.partId)
        const slotIdx = String(placedPart.id).split('_')[1]
        const part = base ? {...base, idx: slotIdx} : null
        if (part) placeables.push(part)
        if (part) document.dispatchEvent(new CustomEvent('jumpspace-drag-start', {detail: {part}, bubbles: true}))
      }
    }

    function onAddPlaceable(part) {
      const idxPlacable = placeables.findIndex(pp => (pp.type === part.type && pp.idx === part.idx))
      if (idxPlacable !== -1) placeables.splice(idxPlacable, 1)
      const idxPlaced = placed.findIndex(pp => pp.id === part.type + '_' + part.idx)
      if (idxPlaced !== -1) placed.splice(idxPlaced, 1)
      if (part) placeables.push(part)
    }

    function onRemovePlaceable(payload) {
      // payload can be index or id
      if (typeof payload === 'number') {
        if (payload >= 0 && payload < placeables.length) placeables.splice(payload, 1)
      } else if (typeof payload === 'string') {
        const i = placeables.findIndex(p => p.id === payload)
        if (i !== -1) placeables.splice(i, 1)
      } else if (payload && payload.id) {
        const i = placeables.findIndex(p => p.id === payload.id)
        if (i !== -1) placeables.splice(i, 1)
      }
    }

    // --- URL state sync ---
    let suppressUrlUpdate = false
    let urlTimer = null

    function buildState() {
      return {
        ship: ship.value,
        r: reactor.value,
        a1: aux1.value,
        a2: aux2.value,
        pl: placeables.map(p => ({ id: p.id, idx: p.idx })),
        pd: placed.map(p => ({ partId: p.partId, idx: String(p.id).split('_')[1], cells: p.cells }))
      }
    }

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

    function updateUrlFromState() {
      if (suppressUrlUpdate) return
      const enc = encodeState(buildState())
      const newHash = '#s=' + enc
      if (location.hash !== newHash) {
        const url = location.pathname + location.search + newHash
        history.replaceState(null, '', url)
      }
    }

    function applyState(state) {
      if (!state) return
      suppressUrlUpdate = true
      try {
        // Set ship and power units
        if (state.ship && availableShips.some(s => s.id === state.ship)) {
          ship.value = state.ship
          changeShip()
        }
        reactor.value = state.r && reactors.some(r => r.id === state.r) ? state.r : 'none'
        aux1.value = state.a1 && auxiliaries.some(a => a.id === state.a1) ? state.a1 : 'none'
        aux2.value = state.a2 && auxiliaries.some(a => a.id === state.a2) ? state.a2 : 'none'
        applyHoles()
        // Restore lists
        placeables.splice(0, placeables.length)
        if (Array.isArray(state.pl)) {
          for (const p of state.pl) {
            const base = parts.find(pp => pp.id === p.id)
            if (base) placeables.push({ ...base, idx: p.idx })
          }
        }
        placed.splice(0, placed.length)
        if (Array.isArray(state.pd)) {
          for (const p of state.pd) {
            const base = parts.find(pp => pp.id === p.partId)
            if (base && Array.isArray(p.cells)) {
              const id = base.type + '_' + p.idx
              placed.push({ id, partId: base.id, name: base.name, cells: p.cells.map(c => [c[0], c[1]]) })
            }
          }
        }
      } finally {
        suppressUrlUpdate = false
      }
      // Ensure URL matches parsed state (normalizes ordering)
      updateUrlFromState()
    }

    function scheduleUrlUpdate() {
      if (suppressUrlUpdate) return
      if (urlTimer) clearTimeout(urlTimer)
      urlTimer = setTimeout(updateUrlFromState, 150)
    }

    onMounted(() => {
      // Load initial state from URL if present
      const m = /^#s=(.+)$/.exec(location.hash || '')
      if (m && m[1]) {
        const st = decodeState(m[1])
        if (st) applyState(st)
      } else {
        updateUrlFromState()
      }
    })

    watch([ship, reactor, aux1, aux2], scheduleUrlUpdate)
    watch(placeables, scheduleUrlUpdate, { deep: true })
    watch(placed, scheduleUrlUpdate, { deep: true })

    return {
      grid,
      parts,
      reactors,
      auxiliaries,
      startDrag,
      tryPlace,
      movePlaced,
      placed,
      clearGrid,
      availableShips,
      ship,
      selectedShip,
      reactor,
      aux1,
      aux2,
      changeShip,
      applyHoles,
      cellSize,
      placeables,
      onAddPlaceable,
      onRemovePlaceable
    }
  }
}
</script>
