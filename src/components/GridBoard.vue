<template>
  <div @pointerdown="onPointerDown" style="touch-action:none">
    <svg :width="cellSize*8" :height="cellSize*8" ref="svgRoot"
         @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"
         style="background:#222935">
      <g v-for="y in 8" :key="'row'+y">
        <rect v-for="x in 8" :key="x"
              :x="(x-1)*cellSize" :y="(y-1)*cellSize" :width="cellSize" :height="cellSize"
              :fill="cellFill(x-1,y-1)" stroke="#111319"/>
        <circle v-for="x in 8" :key="'c' + x"
                :r="cellSize/4" :cx="(x-1)*cellSize + 1/2*cellSize" :cy="(y-1)*cellSize + 1/2*cellSize"
                :fill="cellFillCircle(x-1,y-1)" stroke="#aaaaaa"/>
      </g>
      <g v-for="pl in placed" :key="pl.id">
        <!-- Filled cells without stroke to avoid internal borders -->
        <rect v-for="c in pl.cells" :key="pl.id + '-' + c[0] + '-' + c[1]"
              :x="c[0]*cellSize" :y="c[1]*cellSize" :width="cellSize" :height="cellSize"
              :fill="'#bfe6ffcc'" stroke="none" @pointerdown="onPointerDown">
          <title>{{ pl.name }}</title>
        </rect>
        <!-- Single outline around the union shape -->
        <path v-for="(d, i) in outlineFromCells(pl.cells, cellSize)" :key="pl.id + '-outline-' + i" :d="d"
              fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round">
        </path>
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
      if (v === -1) return '#222222'
      if (v === 1) return '#007ffd'
      return '#00f607'
    }

    function cellFillCircle(x, y) {
      const v = props.grid[y][x]
      if (v === -1) return '#343434'
      if (v === 1) return '#1685f4'
      return '#16f416'
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

    function outlineFromCells(cells, size) {
      // Build boundary edges by adding each cell's edges and canceling shared edges
      const edgeMap = new Map()
      const addOrRemoveEdge = (ax, ay, bx, by) => {
        const a = `${ax},${ay}`
        const b = `${bx},${by}`
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        if (edgeMap.has(key)) {
          edgeMap.delete(key)
        } else {
          edgeMap.set(key, { a: a < b ? [ax, ay] : [bx, by], b: a < b ? [bx, by] : [ax, ay] })
        }
      }

      for (const c of cells) {
        const cx = c[0] * size, cy = c[1] * size
        const x1 = cx, y1 = cy
        const x2 = cx + size, y2 = cy + size
        // top
        addOrRemoveEdge(x1, y1, x2, y1)
        // right
        addOrRemoveEdge(x2, y1, x2, y2)
        // bottom
        addOrRemoveEdge(x2, y2, x1, y2)
        // left
        addOrRemoveEdge(x1, y2, x1, y1)
      }

      if (edgeMap.size === 0) return []

      // Build adjacency map of points to neighbors
      const neighbors = new Map()
      const edgePresent = new Set(edgeMap.keys())
      const addNeighbor = (pStr, qStr) => {
        if (!neighbors.has(pStr)) neighbors.set(pStr, [])
        neighbors.get(pStr).push(qStr)
      }
      for (const [key, edge] of edgeMap) {
        const pa = `${edge.a[0]},${edge.a[1]}`
        const pb = `${edge.b[0]},${edge.b[1]}`
        addNeighbor(pa, pb)
        addNeighbor(pb, pa)
      }

      // Helper to remove undirected edge from edgePresent
      const removeEdge = (pStr, qStr) => {
        const key = pStr < qStr ? `${pStr}|${qStr}` : `${qStr}|${pStr}`
        edgePresent.delete(key)
      }
      const hasEdge = (pStr, qStr) => {
        const key = pStr < qStr ? `${pStr}|${qStr}` : `${qStr}|${pStr}`
        return edgePresent.has(key)
      }

      // Sort points to find a deterministic starting point (top-left)
      const allPoints = Array.from(neighbors.keys())
      const parsePoint = (s) => s.split(',').map(Number)
      allPoints.sort((p, q) => {
        const [px, py] = parsePoint(p)
        const [qx, qy] = parsePoint(q)
        if (py !== qy) return py - qy
        return px - qx
      })

      const paths = []

      // Traverse edges to build closed paths
      while (edgePresent.size > 0) {
        // pick a start point that still has an unused edge
        let start = null
        for (const p of allPoints) {
          const nbrs = neighbors.get(p) || []
          if (nbrs.some(n => hasEdge(p, n))) { start = p; break }
        }
        if (!start) break

        const [sx, sy] = parsePoint(start)
        let d = `M ${sx} ${sy}`
        let current = start
        let prev = null
        let safety = 0
        do {
          const nbrs = neighbors.get(current) || []
          // pick the neighbor that still has an unused edge and is not the previous point (if possible)
          let next = null
          for (const n of nbrs) {
            if (!hasEdge(current, n)) continue
            if (prev && n === prev) continue
            next = n
            break
          }
          // if not found (because only back edge remains), allow going back to prev
          if (!next) {
            for (const n of nbrs) {
              if (hasEdge(current, n)) { next = n; break }
            }
          }
          if (!next) break // dead end (shouldn't happen)

          const [nx, ny] = parsePoint(next)
          d += ` L ${nx} ${ny}`
          removeEdge(current, next)
          prev = current
          current = next
          safety++
          if (safety > 10000) break
        } while (current !== start)
        d += ' Z'
        paths.push(d)
      }

      return paths
    }

    return {svgRoot, cellFill, cellFillCircle, onPointerDown, onPointerMove, onPointerUp, dragging, ghostCells, ghostValid, outlineFromCells}
  }
}
</script>
