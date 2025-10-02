<template>
  <div>
    <h1>Jump Space — Ship Configurator</h1>
    <div class="app">
      <div class="sidebar">
        <h3 style="margin-top:12px">Select Ship</h3>
        <div class="power-row">
          <label for="shipSel">
            Ship
          </label>
          <select id="shipSel" v-model="ship">
            <option v-for="s in availableShips" :value=s.id>{{ s.name }}</option>
          </select>
          <select v-if="ship" v-model="shipTier">
            <option v-for="t in shipTiers" :value="t">{{ t }}</option>
          </select>
        </div>

        <h3 style="margin-top:12px">Choose Reactor & Aux. Generator</h3>
        <div class="power-grid">
          <div class="power-row">
            <label for="reactorSel" class="lbl">Reactor</label>
            <select id="reactorSel" v-model="reactor">
              <option value="none">none</option>
              <option v-for="r in reactors" :value="r.id">{{ r.name }}</option>
            </select>
            <select v-if="reactor !== 'none'" v-model="reactorTier" class="tier-select">
              <option v-for="t in reactorTiers" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="power-row">
            <label for="aux1Sel" class="lbl">Aux B</label>
            <select id="aux1Sel" v-model="aux1">
              <option value="none">none</option>
              <option v-for="a in auxiliaries" :value="a.id">{{ a.name }}</option>
            </select>
            <select v-if="aux1 !== 'none'" v-model="aux1Tier" class="tier-select">
              <option v-for="t in aux1Tiers" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="power-row">
            <label for="aux2Sel" class="lbl">Aux A</label>
            <select id="aux2Sel" v-model="aux2">
              <option value="none">none</option>
              <option v-for="a in auxiliaries" :value="a.id">{{ a.name }}</option>
            </select>
            <select v-if="aux2 !== 'none'" v-model="aux2Tier" class="tier-select">
              <option v-for="t in aux2Tiers" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>

      </div>

      <div class="grid-area">

        <GridBoard ref="board" :grid="grid" :placed="placed" :cellSize="cellSize"
                   @try-place="tryPlace" @move-placed="movePlaced"/>
        <button @click="autoSolve" :disabled="placeables.length === 0">Auto Solve</button>
        <div style="margin-top:12px; display:flex; gap:8px; justify-content: center;">
          <button @click="resetBoard">Clear Grid</button>
          <button @click="resetAll">Reset All</button>
        </div>
        <div style="margin-top:8px;font-size:13px;color:#444">
          Notes: This is a minimal client-side prototype. Rotate with R while dragging.
        </div>
      </div>

      <div class="selection-area">
        <SelectionArea :ship="selectedShip" :placed="placed" :placeables="placeables" :grid="grid"
                       @add-placeable="onAddPlaceable" @remove-placeable="onRemovePlaceable"
                       @clear-placeable="onClearPlaceable" @change-tier="onChangeTier"/>
      </div>
    </div>
    <footer>
      <div class="legal">
        This project is a non-commercial, fan-made utility.<br>
        Images and data are property of Keepsake Games. <a href="https://jumpspacegame.com/">Jump Space</a> is a registered trademark of Keepsake Games.<br>
        No copyright infringement is intended. If you are a rights holder and have concerns, please contact me via GitHub.
      </div>
      <div class="github">
        <a href="https://github.com/attrib/jump-space-configurator" target="_blank">
          <img src="/GitHub_Logo_White.png" alt="Github" style="width: 100px">
        </a>
      </div>
    </footer>
  </div>
</template>

<script>
import GridBoard from './components/GridBoard.vue'
import SelectionArea from './components/SelectionArea.vue'
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipStore } from './stores/shipStore'
import { useGridStore } from './stores/gridStore'
import { useSolver } from './composables/useSolver'
import { useUrlState } from './composables/useUrlState'
import { useGridManager } from './composables/useGridManager'

export default {
  components: { GridBoard, SelectionArea },
  setup() {
    const shipStore = useShipStore()
    const gridStore = useGridStore()
    const { solve } = useSolver()
    const { initializeFromUrl, setupWatchers } = useUrlState()
    const { applyHoles, tryPlace, movePlaced, resetBoard, checkAll } = useGridManager()

    const { selectedShip } = storeToRefs(shipStore)
    const { grid, placed, placeables } = storeToRefs(gridStore)
    const { reactorTiers, aux1Tiers, aux2Tiers, shipTiers } = storeToRefs(shipStore)

    const cellSize = 48

    function autoSolve() {
      const result = solve()
      if (!result.success) {
        alert(result.message)
        return
      }
      // Apply solution
      for (const step of result.solution) {
        const res = tryPlace({
          part: step.part,
          x: step.x,
          y: step.y,
          rotation: step.rotation
        })
        if (!res || !res.ok) {
          console.warn('Unexpected placement failure:', step)
          alert('Unexpected error while applying the solution.')
          return
        }
      }
    }

    function onAddPlaceable(part) {
      const idxPlacable = gridStore.placeables.findIndex(
          pp => (pp.type === part.type && pp.idx === part.idx)
      )
      if (idxPlacable !== -1) gridStore.placeables.splice(idxPlacable, 1)

      const idxPlaced = gridStore.placed.findIndex(
          pp => pp.id === part.type + '_' + part.idx
      )
      if (idxPlaced !== -1) gridStore.placed.splice(idxPlaced, 1)

      if (part) gridStore.addPlaceable(part)
    }

    function onClearPlaceable({ type, idx }) {
      const idxPlacable = gridStore.placeables.findIndex(
          pp => (pp.type === type && pp.idx === idx)
      )
      if (idxPlacable !== -1) gridStore.placeables.splice(idxPlacable, 1)

      const idxPlaced = gridStore.placed.findIndex(
          pp => pp.id === type + '_' + idx
      )
      if (idxPlaced !== -1) gridStore.placed.splice(idxPlaced, 1)
    }

    function onChangeTier({ idx, type, part }) {
      const idxPlacable = gridStore.placeables.findIndex(
          pp => (pp.type === type && pp.idx === idx)
      )
      if (idxPlacable !== -1) {
        gridStore.placeables[idxPlacable] = Object.assign(gridStore.placeables[idxPlacable], part)
      }

      const idxPlaced = gridStore.placed.findIndex(
          pp => pp.id === type + '_' + idx
      )
      if (idxPlaced !== -1) {
        gridStore.placed[idxPlaced].partId = part.id
      }
    }

    function resetAll() {
      // Reset ship and power selections to defaults
      shipStore.setShip('catamaran')
      shipStore.setShipTier('T0')
      shipStore.setReactor('none')
      shipStore.setReactorTier('T1')
      shipStore.setAux1('none')
      shipStore.setAux1Tier('T1')
      shipStore.setAux2('none')
      shipStore.setAux2Tier('T1')

      // Clear all placed and placeables
      if (gridStore.placed.length) gridStore.placed.splice(0, gridStore.placed.length)
      if (gridStore.placeables.length) gridStore.placeables.splice(0, gridStore.placeables.length)

      // Recompute grid holes and validate
      applyHoles()
      checkAll()

      // Notify selection area to clear its local selections state
      document.dispatchEvent(new CustomEvent('apply-state', {}))
    }

    onMounted(() => {
      initializeFromUrl()
      setupWatchers()
      window.addEventListener("hashchange", (event) => {
        initializeFromUrl()
      })
    })

    return {
      // Ship & Power
      ship: computed({
        get: () => shipStore.shipId,
        set: (val) => {
          shipStore.setShip(val)
          checkAll()
        }
      }),
      shipTier: computed({
        get: () => shipStore.shipTier,
        set: (val) => {
          shipStore.setShipTier(val)
          checkAll()
        }
      }),
      reactor: computed({
        get: () => shipStore.reactorId,
        set: (val) => {
          shipStore.setReactor(val)
          applyHoles()
        }
      }),
      reactorTier: computed({
        get: () => shipStore.reactorTier,
        set: (val) => {
          shipStore.setReactorTier(val)
          applyHoles()
        }
      }),
      aux1: computed({
        get: () => shipStore.aux1Id,
        set: (val) => {
          shipStore.setAux1(val)
          applyHoles()
        }
      }),
      aux1Tier: computed({
        get: () => shipStore.aux1Tier,
        set: (val) => {
          shipStore.setAux1Tier(val)
          applyHoles()
        }
      }),
      aux2: computed({
        get: () => shipStore.aux2Id,
        set: (val) => {
          shipStore.setAux2(val)
          applyHoles()
        }
      }),
      aux2Tier: computed({
        get: () => shipStore.aux2Tier,
        set: (val) => {
          shipStore.setAux2Tier(val)
          applyHoles()
        }
      }),
      selectedShip: selectedShip,
      availableShips: shipStore.availableShips,
      reactors: shipStore.reactors,
      auxiliaries: shipStore.auxiliaries,
      shipTiers,
      reactorTiers,
      aux1Tiers,
      aux2Tiers,

      // Grid
      grid,
      placed,
      placeables,

      // Methods
      cellSize,
      tryPlace,
      movePlaced,
      resetBoard,
      autoSolve,
      applyHoles,
      onAddPlaceable,
      onRemovePlaceable: gridStore.removePlaceable,
      onChangeTier,
      onClearPlaceable,
      resetAll
    }
  }
}
</script>


<style scoped>
/* Align power selection rows into columns */
.power-grid { display: grid; gap: 8px; }
.power-row { display: grid; grid-template-columns: 64px 1fr 50px; align-items: center; gap: 8px; }
.power-row .lbl { font-weight: 600; }
.power-row select { width: 100%; }
/* Small tier select width and right alignment for consistency */
.power-row .tier-select { width: 100%; }
</style>
