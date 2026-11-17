import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rolldownOptions: {
      output: {
        // ECharts and zrender (the library it draws with) each get their own file. Each is
        // downloaded only with a screen that has charts, and stays cached when our own code changes.
        codeSplitting: {
          groups: [
            { name: 'zrender', test: /node_modules[\\/]zrender[\\/]/, priority: 20 },
            { name: 'echarts', test: /node_modules[\\/]echarts[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    unstubGlobals: true,
    css: { include: [/index\.css/] },
  },
})
