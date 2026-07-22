import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: new URL('./src/content.ts', import.meta.url).pathname,
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
      },
    },
  },
});
