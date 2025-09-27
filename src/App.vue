<template>
  <div>
    <h1>Jump Space — Ship Configurator</h1>
    <div class="app">
      <div class="sidebar">
        <h3 style="margin-top:12px">Select Ship</h3>
        <div>
          <label>Ship
            <select v-model="ship" @change="applyHoles">
              <option value="catamaran-t0">C-3 Catamaran T0</option>
              <option value="catamaran-t1">C-3 Catamaran T1</option>
              <option value="dart-t0">DT-4 Dart</option>
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

        <h3 style="margin-top:12px">Parts (drag onto grid)</h3>
        <div>
          <div v-for="p in parts" :key="p.id" class="piece"
               :style="{border:'1px solid #ccc', padding:'6px', margin:'6px 0', display:'inline-block'}"
               @pointerdown.prevent="startDrag($event, p)">
            <strong>{{ p.name }}</strong>
            <div style="font-size:12px;color:#555">{{ p.type }}</div>
          </div>
        </div>

        <button style="margin-top:12px" @click="clearGrid">Clear Grid</button>
      </div>

      <div class="grid-area">
        <GridBoard ref="board" :grid="grid" :placed="placed" :cellSize="cellSize"
                   @try-place="tryPlace" @move-placed="movePlaced"/>
      </div>
    </div>
    <div style="margin-top:8px;font-size:13px;color:#444">
      Notes: This is a minimal client-side prototype. Rotate with R while dragging. Pieces cannot be placed on holes.
    </div>
  </div>
</template>

<script>
import GridBoard from './components/GridBoard.vue'
import {reactive, ref} from 'vue'
import data from './data/parts.json'

export default {
  components: {GridBoard},
  setup() {
    const grid = reactive(Array.from({length: 8}, () => Array(8).fill(0)))
    const placed = reactive([])
    const ship = ref('catamaran-t0')
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

    function applyHoles() {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) grid[y][x] = -1
      applyHolesFor(reactors, reactor.value, 0)
      applyHolesFor(auxiliaries, aux1.value, 4)
      applyHolesFor(auxiliaries, aux2.value, 6)
      placed.splice(0, placed.length)
      // remove focus state of all drop downs

    }

    function applyHolesFor(list, selected, offsetY) {
      const item = list.find(i => i.id === selected)
      if (!item) return
      for (let [y, line] of item.shape.entries()) {
        for (let x = 0; x < 8; x++) {
          const ch = line[x]
          if (ch === 'U') grid[y + offsetY][x] = 0
          if (ch === 'P') grid[y + offsetY][x] = 1
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
      const id = part.id + '_' + (placed.length + 1)
      const cells = final.map(c => c)
      placed.push({id, partId: part.id, name: part.name, cells})
      return {ok: true, id}
    }

    function movePlaced(placedPart) {
      const idx = placed.findIndex(p => p.id === placedPart.id)
      if (idx !== -1) {
        placed.splice(idx, 1)
        const part = parts.find(p => p.id === placedPart.partId)
        document.dispatchEvent(new CustomEvent('jumpspace-drag-start', {detail: {part}, bubbles: true}))
      }
    }

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
      ship,
      reactor,
      aux1,
      aux2,
      applyHoles,
      cellSize
    }
  }
}
</script>
