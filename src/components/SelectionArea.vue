<template>
  <div>
    Placeables
  </div>
  <div>
    <div>
    <label>
      Sensor
      <select v-for="n in ship.sensor">
        <option value="">None</option>
        <option v-for="p in parts.filter((p) => p.type === 'Sensors')" :value=p.id>{{ p.name }}</option>
      </select>
    </label>
    </div>
    <div>
    <label>
      Engine
      <select v-for="n in ship.engine">
        <option value="">None</option>
        <option v-for="p in parts.filter((p) => p.type === 'Engines')" :value=p.id>{{ p.name }}</option>
      </select>
    </label>
    </div>
    <div>
    <label>
      Pilot Cannon
      <select v-for="n in ship.pilotCannon">
        <option value="">None</option>
        <option v-for="p in parts.filter((p) => p.type === 'Pilot Cannon')" :value=p.id>{{ p.name }}</option>
      </select>
    </label>
    </div>
    <div>
    <label>
      Multi Turret System
      <select v-for="n in ship.multiTurretSystem">
        <option value="">None</option>
        <option v-for="p in parts.filter((p) => p.type === 'Multi Turret Systems')" :value=p.id>{{ p.name }}</option>
      </select>
    </label>
    </div>
    <div>
    <label>
      Special Weapon
      <select v-for="n in ship.specialWeapon">
        <option value="">None</option>
        <option v-for="p in parts.filter((p) => p.type === 'Special Weapons')" :value=p.id>{{ p.name }}</option>
      </select>
    </label>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SelectionArea',
  props: {ship: Object, placed: Array, parts: Array},
  setup(props, {emit}) {

  }
}
</script>