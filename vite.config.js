
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// When building on GitHub Actions, set base to the repository name so assets resolve on GitHub Pages.
const isCI = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [vue()],
  base: isCI ? '/jump-space-configurator/' : '/',
})
