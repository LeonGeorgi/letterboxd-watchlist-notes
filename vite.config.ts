import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        format: 'esm', // Use ES module format, suitable for modern browsers
        dir: 'dist',
        entryFileNames: '[name].js'
      }
    }
  }
});
