import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import data from '../data/parts.json'

/** @typedef {import('../types').Ship} Ship */
/** @typedef {import('../types').Reactor} Reactor */
/** @typedef {import('../types').Auxiliary} Auxiliary */

export const useShipStore = defineStore('ship', () => {
  const shipId = ref('catamaran-t0')
  const reactorId = ref('none')
  const aux1Id = ref('none')
  const aux2Id = ref('none')

  /** @type {Ship[]} */
  const availableShips = data.ships
  /** @type {Reactor[]} */
  const reactors = data.reactors
  /** @type {Auxiliary[]} */
  const auxiliaries = data.auxiliaries

  /**
   * @type {Ship}
   */
  const selectedShip = computed(() => {
    return availableShips.find(s => s.id === shipId.value) || {}
  })

  /**
   * @param {string} id
   */
  function setShip(id) {
    shipId.value = id
  }

  /**
   * @param {string} id
   */
  function setReactor(id) {
    reactorId.value = id
  }

  /**
   * @param {string} id
   */
  function setAux1(id) {
    aux1Id.value = id
  }

  /**
   * @param {string} id
   */
  function setAux2(id) {
    aux2Id.value = id
  }

  return {
    shipId,
    reactorId,
    aux1Id,
    aux2Id,
    selectedShip,
    availableShips,
    reactors,
    auxiliaries,
    setShip,
    setReactor,
    setAux1,
    setAux2
  }
})