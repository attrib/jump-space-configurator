<template>
  <div @pointerdown="onPointerDown" style="touch-action:none">
    <svg :width="cellSize*8" :height="cellSize*8" ref="svgRoot"
         @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"
         style="border:1px solid #ddd;background:white">
      <g v-for="y in 8" :key="'row'+y">
        <rect v-for="x in 8" :key="x"
              :x="(x-1)*cellSize" :y="(y-1)*cellSize" :width="cellSize" :height="cellSize"
              :fill="cellFill(x-1,y-1)" stroke="#e1e1e6"/>
      </g>
      <g v-for="pl in placed" :key="pl.id">
        <rect v-for="c in pl.cells" :key="pl.id + '-' + c[0] + '-' + c[1]"
              :x="c[0]*cellSize" :y="c[1]*cellSize" :width="cellSize" :height="cellSize"
              :fill="'#bfe6ffaa'" stroke="#5aa6d8" @pointerdown="onPointerDown">
          <title>{{ pl.name }}</title>
        </rect>
      </g>
      <g v-if="dragging">
        <rect v-for="c in ghostCells" :key="'g'+c[0]+'-'+c[1]"
              :x="c[0]*cellSize" :y="c[1]*cellSize" :width="cellSize" :height="cellSize"
              :fill="ghostValid? 'rgba(120,200,120,0.45)' : 'rgba(200,120,120,0.45)'" stroke="black"/>
      </g>
    </svg>
  </div>
</template>

<script>
import {onMounted, ref} from 'vue'

export default {
  name: 'GridBoard',
  props: {grid: Array, placed: Array, cellSize: Number},
  emits: ['try-place', 'move-placed'],
  setup(props, {emit}) {
    const svgRoot = ref(null)
    let currentPart = null
    let rotation = 0
    const dragging = ref(false)
    const ghostCells = ref([])
    const ghostValid = ref(false)

    function cellFill(x, y) {
      const v = props.grid[y][x]
      if (v === -1) return '#333'
      if (v === 1) return 'blue'
      return 'white'
    }

    function toGridCoords(clientX, clientY) {
      const rect = svgRoot.value.getBoundingClientRect()
      const x = Math.floor((clientX - rect.left) / props.cellSize)
      const y = Math.floor((clientY - rect.top) / props.cellSize)
      return [x, y]
    }

    function computeGhostCells(baseX, baseY, part, rotationVal) {
      const coords = []
      for (const [sx, sy] of part.shape) {
        let tx = sx, ty = sy
        const r = rotationVal % 4
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
        coords.push([baseX + tx, baseY + ty])
      }
      return coords
    }

    function checkGhost(validCells) {
      for (const [gx, gy] of validCells) {
        if (gx < 0 || gy < 0 || gx >= 8 || gy >= 8) return false
        if (props.grid[gy][gx] === -1) return false
        for (const pl of props.placed) {
          for (const c of pl.cells) {
            if (c[0] === gx && c[1] === gy) return false
          }
        }
      }
      return true
    }

    function onPointerDown(e) {
      const [gx, gy] = toGridCoords(e.clientX, e.clientY)
      if (gx < 0 || gy < 0 || gx >= 8 || gy >= 8) return

      let foundPart = null
      for (const pl of props.placed) {
        for (const c of pl.cells) {
          if (c[0] === gx && c[1] === gy) {
            foundPart = pl
            break
          }
        }
      }
      if (!foundPart) return
      emit('move-placed', foundPart)
    }

    function onPointerMove(e) {
      if (!dragging.value) return
      const [gx, gy] = toGridCoords(e.clientX, e.clientY)
      const cells = computeGhostCells(gx, gy, currentPart, rotation)
      ghostCells.value = cells
      ghostValid.value = checkGhost(cells)
    }

    function onPointerUp(e) {
      if (!dragging.value) return
      const [gx, gy] = toGridCoords(e.clientX, e.clientY)
      const cells = computeGhostCells(gx, gy, currentPart, rotation)
      const ok = checkGhost(cells)
      if (ok) {
        emit('try-place', {part: currentPart, x: gx, y: gy, rotation})
      }
      dragging.value = false
      currentPart = null
      ghostCells.value = []
      rotation = 0
      window.removeEventListener('keydown', onKey)
    }

    function onKey(e) {
      if (e.key.toLowerCase() === 'r') rotation = (rotation + 1) % 4
    }

    onMounted(() => {
      document.addEventListener('jumpspace-drag-start', (ev) => {
        currentPart = ev.detail.part
        dragging.value = true
        window.addEventListener('keydown', onKey)
      })
    })

    return {svgRoot, cellFill, onPointerDown, onPointerMove, onPointerUp, dragging, ghostCells, ghostValid}
  }
}
</script>
