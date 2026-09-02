import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' gør at appen virker både på GitHub Pages (/FredagsBar/) og på et rod-domæne.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, host: true },
});
