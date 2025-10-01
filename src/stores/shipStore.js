import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import data from '../data/parts.json'

/** @typedef {import('../types').Ship} Ship */
/** @typedef {import('../types').Reactor} Reactor */
/** @typedef {import('../types').Auxiliary} Auxiliary */

export const useShipStore = defineStore('ship', () => {
  // Base ship id and tier
  const shipId = ref('catamaran')
  const shipTier = ref('T0')

  // Selections: base ids and tiers
  const reactorId = ref('none')
  const reactorTier = ref('T1')
  const aux1Id = ref('none')
  const aux1Tier = ref('T1')
  const aux2Id = ref('none')
  const aux2Tier = ref('T1')

  /** @type {Ship[]} */
  const availableShips = data.ships
  /** @type {Reactor[]} */
  const reactors = data.reactors
  /** @type {Auxiliary[]} */
  const auxiliaries = data.auxiliaries

  // Active (resolved) ship config for current tier, exposing slot counts for consumers
  const selectedShip = computed(() => {
    const base = availableShips.find(s => s.id === shipId.value)
    if (!base) return {}
    const tierCfg = (base.tiers || {})[shipTier.value]
    if (!tierCfg) return {}
    return {
      id: base.id,
      name: base.name,
      ...tierCfg
    }
  })

  function setShip(id) {
    shipId.value = id
    // Ensure current shipTier is valid for the new ship; fallback to first available
    const base = availableShips.find(s => s.id === id)
    if (base && (!base.tiers || !base.tiers[shipTier.value])) {
      const keys = base && base.tiers ? Object.keys(base.tiers) : []
      if (keys.length) shipTier.value = keys[0]
    }
  }
  function setShipTier(tier) {
    shipTier.value = tier
  }

  // Setters for base IDs
  function setReactor(id) {
    reactorId.value = id
  }
  function setReactorTier(tier) {
    reactorTier.value = tier
  }
  function setAux1(id) {
    aux1Id.value = id
    // If same aux selected in slot 2, sync its tier
    if (aux2Id.value === id) aux2Tier.value = aux1Tier.value
  }
  function setAux1Tier(tier) {
    aux1Tier.value = tier
    if (aux1Id.value !== 'none' && aux1Id.value === aux2Id.value) {
      aux2Tier.value = tier
    }
  }
  function setAux2(id) {
    aux2Id.value = id
    // If same aux selected in slot 1, sync its tier
    if (aux1Id.value === id) aux1Tier.value = aux2Tier.value
  }
  function setAux2Tier(tier) {
    aux2Tier.value = tier
    if (aux2Id.value !== 'none' && aux1Id.value === aux2Id.value) {
      aux1Tier.value = tier
    }
  }

  // Helpers to list available tiers for current selections
  const shipTiers = computed(() => {
    const s = availableShips.find(s => s.id === shipId.value)
    return s && s.tiers ? Object.keys(s.tiers) : []
  })
  const reactorTiers = computed(() => {
    const r = reactors.find(r => r.id === reactorId.value)
    return r ? Object.keys(r.tiers) : []
  })
  const aux1Tiers = computed(() => {
    const a = auxiliaries.find(a => a.id === aux1Id.value)
    return a ? Object.keys(a.tiers) : []
  })
  const aux2Tiers = computed(() => {
    const a = auxiliaries.find(a => a.id === aux2Id.value)
    return a ? Object.keys(a.tiers) : []
  })

  return {
    shipId,
    shipTier,
    reactorId,
    reactorTier,
    aux1Id,
    aux1Tier,
    aux2Id,
    aux2Tier,
    selectedShip,
    availableShips,
    reactors,
    auxiliaries,
    shipTiers,
    reactorTiers,
    aux1Tiers,
    aux2Tiers,
    setShip,
    setShipTier,
    setReactor,
    setReactorTier,
    setAux1,
    setAux1Tier,
    setAux2,
    setAux2Tier
  }
})