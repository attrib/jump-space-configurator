
# Jump Space Configurator (Prototype)

Minimal Vue 3 + Vite project to prototype an 8x8 grid ship configurator.

## How to run
1. `npm install`
2. `npm run dev`
3. Open the shown URL (default http://localhost:5173)

## Features
- Choose reactor and aux → adds "holes" in the grid.
- Drag parts from sidebar to grid (press **R** while dragging to rotate).
- Prevents placing parts on holes or overlapping.

## Data-driven parts (JSON)
- Parts, reactors, and auxiliaries are defined in a pretty-printed JSON file at `src/data/parts.json`.
- Parts support a `type` field for categorization (e.g., "pilot canons", "multi turret systems", "sensors", "engines", "special weapons").
- Reactor and auxiliary shapes are expressed as flat strings where each 8-character chunk is a row in the 8x8 grid. Reactors currently occupy 4 rows (32 characters), auxiliaries typically 2 rows (16 characters).

This is just a starting prototype, no auto-solver yet.


## Attribution
Most of the code in this repository was authored by Junie — an autonomous programmer (AI assistant by JetBrains) — during collaborative sessions with the project owner. Unless otherwise noted, recent refactors and features were implemented by Junie based on user-provided requirements and assets.